"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { criarPagamentoPix } from "@/lib/mercadopago";
import type { ActionResult } from "@/actions/anuncios";
import type { CompraSel, PixPagamento } from "@/actions/rifas";
import { validarPedido, type PixKeyType, type SaqueStatus } from "@/lib/nexuspag/saques";
import { despacharSaque, reconciliarSaques, saqueConfig } from "@/lib/nexuspag/saques-server";

// Carteira do usuário. O saldo vem SEMPRE da soma do extrato no banco
// (carteira_movimentos); todas as operações de dinheiro são funções do
// Postgres com trava por usuário — o app só chama e mostra.

export type ResumoCarteira = { saldo: number; aReceber: number };

export type Movimento = {
  id: string;
  tipo: "deposito" | "compra_cota" | "ganho_rifa" | "saque" | "estorno_saque" | "ajuste";
  valor: number;
  descricao: string;
  created_at: string;
};

export type Saque = {
  id: string;
  user_id: string;
  valor: number;
  chave_pix: string;
  status: SaqueStatus;
  pix_key_type: PixKeyType | null;
  motivo: string | null;
  precisa_revisao: boolean;
  provider_withdrawal_id: string | null;
  created_at: string;
  processado_em: string | null;
};

/** Saldo + a receber das rifas. null se não logado ou se a carteira ainda não existe no banco. */
export async function resumoCarteira(): Promise<ResumoCarteira | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("carteira_resumo");
  if (error || !data) return null;
  const r = data as { saldo: number | string; a_receber: number | string };
  return { saldo: Number(r.saldo) || 0, aReceber: Number(r.a_receber) || 0 };
}

export async function meuExtrato(): Promise<{ movimentos: Movimento[]; saques: Saque[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { movimentos: [], saques: [] };

  const [mov, saq] = await Promise.all([
    supabase
      .from("carteira_movimentos")
      .select("id, tipo, valor, descricao, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60)
      .returns<Movimento[]>(),
    supabase
      .from("carteira_saques")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<Saque[]>(),
  ]);
  return {
    movimentos: (mov.data ?? []).map((m) => ({ ...m, valor: Number(m.valor) })),
    saques: (saq.data ?? []).map((s) => ({ ...s, valor: Number(s.valor) })),
  };
}

/** Gera um Pix (conta da plataforma) para adicionar saldo. */
export async function iniciarDeposito(valor: number): Promise<ActionResult<PixPagamento>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Entre para adicionar saldo." };
  if (!Number.isFinite(valor) || valor < 5) return { ok: false, error: "O depósito mínimo é R$ 5,00." };
  if (valor > 5000) return { ok: false, error: "O depósito máximo é R$ 5.000,00." };

  const { data: ini, error } = await supabase.rpc("carteira_iniciar_deposito", { p_valor: valor });
  if (error) return { ok: false, error: error.message };
  const info = ini as { pagamento_id: string; valor: number };

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get("origin") || "";
    const pix = await criarPagamentoPix({
      valor: Number(info.valor),
      descricao: "Cloud Skins · depósito na carteira",
      email: user.email,
      idempotency: info.pagamento_id,
      externalReference: info.pagamento_id,
      notificationUrl: origin ? `${origin}/api/mp/webhook` : undefined,
      expiraEmMin: 30,
    });
    await supabase.rpc("rifa_set_pix", {
      p_pagamento: info.pagamento_id,
      p_mp_id: pix.id,
      p_copia: pix.qr_copia,
      p_base64: pix.qr_base64,
    });
    return {
      ok: true,
      data: {
        pagamentoId: info.pagamento_id,
        valor: Number(info.valor),
        qrBase64: pix.qr_base64,
        copiaCola: pix.qr_copia,
        numeros: [],
      },
    };
  } catch (err) {
    await supabase.rpc("rifa_cancelar_proprio", { p_pagamento: info.pagamento_id });
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao gerar o Pix." };
  }
}

/**
 * Pedido de saque Pix. Valida de novo no servidor (e o banco valida limites,
 * saldo e saque em andamento com trava por usuário) e reserva o saldo.
 * O envio à NexusPag só acontece se NEXUSPAG_WITHDRAW_ENABLED=true; senão o
 * saque fica na fila para a equipe.
 */
export async function solicitarSaque(input: {
  valor: number;
  tipo: string;
  chave: string;
  confirmado: boolean;
}): Promise<ActionResult<{ status: SaqueStatus; enviado: boolean }>> {
  if (!input.confirmado) return { ok: false, error: "Confirme os dados do saque." };
  const v = validarPedido(input);
  if (!v.ok) return { ok: false, error: v.erro };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(); // identidade validada no servidor do Supabase
  if (!user) return { ok: false, error: "Entre para sacar." };

  const { data, error } = await supabase.rpc("carteira_saque_solicitar", {
    p_valor: v.pedido.valor,
    p_chave_pix: v.pedido.chave,
    p_tipo: v.pedido.tipo,
  });
  if (error) return { ok: false, error: error.message };
  const criado = data as { id: string; status: SaqueStatus };

  let status: SaqueStatus = criado.status;
  let enviado = false;
  if (saqueConfig().enabled) {
    const r = await despacharSaque(criado.id).catch(() => null);
    if (r?.estado === "enviado") {
      enviado = true;
      status = r.decisao.status;
    }
  }
  revalidatePath("/carteira");
  return { ok: true, data: { status, enviado } };
}

/** Compra cotas debitando do saldo (cotas já saem pagas). */
export async function comprarCotasComSaldo(
  rifaId: string,
  sel: CompraSel,
): Promise<ActionResult<{ numeros: number[]; valor: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rifa_comprar_com_saldo", {
    p_rifa: rifaId,
    p_qtd: sel.tipo === "aleatorio" ? sel.qtd : null,
    p_numeros: sel.tipo === "numeros" ? sel.numeros : null,
  });
  if (error) return { ok: false, error: error.message };
  const r = data as { numeros: number[]; valor: number };
  revalidatePath(`/rifas/${rifaId}`);
  revalidatePath("/carteira");
  return { ok: true, data: { numeros: r.numeros, valor: Number(r.valor) } };
}

// ---------- Admin ----------

async function exigirAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, ok: isAdminEmail(user?.email) };
}

export type SaqueAdmin = Saque & { nome: string | null };

/** Saques que pedem atenção: na fila, em processamento ou marcados para revisão. */
export async function listarSaquesPendentes(): Promise<SaqueAdmin[]> {
  const { supabase, ok } = await exigirAdmin();
  if (!ok) return [];
  const { data } = await supabase
    .from("carteira_saques")
    .select("*")
    .or("status.in.(pending,processing),precisa_revisao.eq.true")
    .order("created_at", { ascending: true })
    .returns<Saque[]>();
  if (!data?.length) return [];
  const { data: perfis } = await supabase
    .from("profiles")
    .select("id, nome")
    .in("id", [...new Set(data.map((s) => s.user_id))])
    .returns<{ id: string; nome: string | null }[]>();
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome]));
  return data.map((s) => ({ ...s, valor: Number(s.valor), nome: nome.get(s.user_id) ?? null }));
}

/** Admin: reconcilia saques em processamento com o histórico da NexusPag (não reenvia nada). */
export async function reconciliarSaquesAdmin(): Promise<ActionResult<{ verificados: number; concluidos: number; falhos: number; revisao: number }>> {
  const { ok } = await exigirAdmin();
  if (!ok) return { ok: false, error: "Não autorizado." };
  try {
    const r = await reconciliarSaques();
    if (!r) return { ok: false, error: "Integração de saques não configurada (chave ou subconta)." };
    revalidatePath("/admin");
    return { ok: true, data: r };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao consultar a NexusPag." };
  }
}

export async function processarSaque(id: string, aprovar: boolean, motivo = ""): Promise<ActionResult<null>> {
  const { supabase, ok } = await exigirAdmin();
  if (!ok) return { ok: false, error: "Não autorizado." };
  const { error } = await supabase.rpc("carteira_admin_processar_saque", {
    p_saque: id,
    p_aprovar: aprovar,
    p_motivo: motivo,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, data: null };
}
