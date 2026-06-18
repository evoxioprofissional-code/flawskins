"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { criarPagamentoPix } from "@/lib/mercadopago";
import type { ActionResult } from "@/actions/anuncios";
import type { Rifa, RifaNumero } from "@/types/rifa";

export async function listarRifas(): Promise<Rifa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rifas_pub")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<Rifa[]>();
  if (error) return [];
  return data ?? [];
}

export async function buscarRifa(id: string): Promise<Rifa | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rifas_pub")
    .select("*")
    .eq("id", id)
    .maybeSingle<Rifa>();
  if (error) return null;
  return data;
}

// Números de uma rifa (para grid / participantes). Use só em rifas pequenas
// no grid; para a lista de participantes é ok também.
export async function numerosDaRifa(rifaId: string): Promise<RifaNumero[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rifa_numeros")
    .select("*")
    .eq("rifa_id", rifaId)
    .order("numero", { ascending: true })
    .returns<RifaNumero[]>();
  return data ?? [];
}

export type NovaRifa = {
  titulo: string;
  premio: string;
  descricao?: string;
  image_url?: string;
  preco_cota: number;
  total_numeros: number;
};

export async function criarRifa(
  input: NovaRifa
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return { ok: false, error: "Apenas o admin pode criar rifas." };
  }
  const titulo = input.titulo.trim();
  if (titulo.length < 3) return { ok: false, error: "Título muito curto." };
  if (!input.premio.trim()) return { ok: false, error: "Informe o prêmio." };
  if (!(input.preco_cota >= 0)) return { ok: false, error: "Preço inválido." };
  if (!(input.total_numeros >= 1 && input.total_numeros <= 100000)) {
    return { ok: false, error: "Total de números deve ser de 1 a 100000." };
  }

  const { data, error } = await supabase
    .from("rifas")
    .insert({
      titulo,
      premio: input.premio.trim(),
      descricao: input.descricao?.trim() || null,
      image_url: input.image_url || null,
      preco_cota: input.preco_cota,
      total_numeros: Math.round(input.total_numeros),
      created_by: user!.id,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/rifas");
  return { ok: true, data: { id: data.id } };
}

export async function editarRifa(
  id: string,
  input: NovaRifa
): Promise<ActionResult<{ id: string }>> {
  const { supabase, ok } = await exigirAdmin();
  if (!ok) return { ok: false, error: "Apenas o admin pode editar rifas." };

  const titulo = input.titulo.trim();
  if (titulo.length < 3) return { ok: false, error: "Título muito curto." };
  if (!input.premio.trim()) return { ok: false, error: "Informe o prêmio." };
  if (!(input.preco_cota >= 0)) return { ok: false, error: "Preço inválido." };

  // Não deixa reduzir o total abaixo do que já foi vendido.
  const { data: atual } = await supabase
    .from("rifas_pub")
    .select("vendidos")
    .eq("id", id)
    .maybeSingle<{ vendidos: number }>();
  const vendidos = atual?.vendidos ?? 0;
  if (input.total_numeros < vendidos) {
    return {
      ok: false,
      error: `Já foram vendidas ${vendidos} cotas — o total não pode ser menor.`,
    };
  }

  const { error } = await supabase
    .from("rifas")
    .update({
      titulo,
      premio: input.premio.trim(),
      descricao: input.descricao?.trim() || null,
      image_url: input.image_url || null,
      preco_cota: input.preco_cota,
      total_numeros: Math.round(input.total_numeros),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/rifas");
  revalidatePath(`/rifas/${id}`);
  return { ok: true, data: { id } };
}

export async function excluirRifa(id: string): Promise<ActionResult<null>> {
  const { supabase, ok } = await exigirAdmin();
  if (!ok) return { ok: false, error: "Não autorizado." };
  const { error } = await supabase.from("rifas").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/rifas");
  return { ok: true, data: null };
}

// Reserva rápida: N números aleatórios.
export async function reservarAleatorio(
  rifaId: string,
  qtd: number
): Promise<ActionResult<{ numeros: number[] }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rifa_reservar", {
    p_rifa: rifaId,
    p_qtd: qtd,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/rifas/${rifaId}`);
  return { ok: true, data: { numeros: (data ?? []).map((d: { numero: number }) => d.numero) } };
}

// Reserva números escolhidos.
export async function reservarNumeros(
  rifaId: string,
  numeros: number[]
): Promise<ActionResult<{ numeros: number[] }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rifa_reservar_numeros", {
    p_rifa: rifaId,
    p_numeros: numeros,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/rifas/${rifaId}`);
  const got = (data ?? []).map((d: { numero: number }) => d.numero);
  if (got.length === 0)
    return { ok: false, error: "Esses números já foram pegos. Tente outros." };
  return { ok: true, data: { numeros: got } };
}

// ---- Pagamento Pix (Mercado Pago) ----
export type CompraSel =
  | { tipo: "aleatorio"; qtd: number }
  | { tipo: "numeros"; numeros: number[] };

export type PixPagamento = {
  pagamentoId: string;
  valor: number;
  qrBase64: string;
  copiaCola: string;
  numeros: number[];
};

// Reserva os números e gera o Pix do Mercado Pago.
export async function comprarCotas(
  rifaId: string,
  sel: CompraSel
): Promise<ActionResult<PixPagamento>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Entre para comprar cotas." };

  // 1) Reserva os números + cria o registro de pagamento (atômico).
  const { data: ini, error: e1 } = await supabase.rpc("rifa_iniciar_pagamento", {
    p_rifa: rifaId,
    p_qtd: sel.tipo === "aleatorio" ? sel.qtd : null,
    p_numeros: sel.tipo === "numeros" ? sel.numeros : null,
  });
  if (e1) return { ok: false, error: e1.message };
  const info = ini as { pagamento_id: string; numeros: number[]; valor: number };

  // 2) Gera o Pix no Mercado Pago.
  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (await headers()).get("origin") ||
      "";
    const pix = await criarPagamentoPix({
      valor: info.valor,
      descricao: `FlawSkins · ${info.numeros.length} cota(s) de rifa`,
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

    revalidatePath(`/rifas/${rifaId}`);
    return {
      ok: true,
      data: {
        pagamentoId: info.pagamento_id,
        valor: info.valor,
        qrBase64: pix.qr_base64,
        copiaCola: pix.qr_copia,
        numeros: info.numeros,
      },
    };
  } catch (err) {
    // Falhou o Pix → libera os números reservados.
    await supabase.rpc("rifa_cancelar_proprio", { p_pagamento: info.pagamento_id });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao gerar o Pix.",
    };
  }
}

export async function statusPagamento(
  pagamentoId: string
): Promise<"pendente" | "pago" | "cancelado" | "desconhecido"> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rifa_pagamentos")
    .select("status")
    .eq("id", pagamentoId)
    .maybeSingle<{ status: "pendente" | "pago" | "cancelado" }>();
  return data?.status ?? "desconhecido";
}

export async function cancelarMeuPagamento(
  pagamentoId: string
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rifa_cancelar_proprio", {
    p_pagamento: pagamentoId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// ---- Admin ----
async function exigirAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, ok: isAdminEmail(user?.email) };
}

export async function marcarTodosPagos(
  rifaId: string
): Promise<ActionResult<null>> {
  const { supabase, ok } = await exigirAdmin();
  if (!ok) return { ok: false, error: "Não autorizado." };
  const { error } = await supabase
    .from("rifa_numeros")
    .update({ status: "pago" })
    .eq("rifa_id", rifaId)
    .eq("status", "reservado");
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/rifas/${rifaId}`);
  return { ok: true, data: null };
}

export async function encerrarRifa(rifaId: string): Promise<ActionResult<null>> {
  const { supabase, ok } = await exigirAdmin();
  if (!ok) return { ok: false, error: "Não autorizado." };
  const { error } = await supabase
    .from("rifas")
    .update({ status: "encerrada" })
    .eq("id", rifaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/rifas/${rifaId}`);
  return { ok: true, data: null };
}

export async function sortearVencedor(
  rifaId: string
): Promise<ActionResult<{ numero: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rifa_sortear", { p_rifa: rifaId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/rifas/${rifaId}`);
  return { ok: true, data: { numero: (data as { numero: number }).numero } };
}
