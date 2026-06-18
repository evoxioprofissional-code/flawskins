"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getCreatorToken } from "@/lib/supabase/admin";
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

  // Define se o dinheiro vai pra conta do criador (rifa de usuário) ou nossa.
  const { data: pay } = await supabase
    .from("rifa_pagamentos")
    .select("mp_conta_user")
    .eq("id", info.pagamento_id)
    .maybeSingle<{ mp_conta_user: string | null }>();

  let accessToken: string | undefined;
  if (pay?.mp_conta_user) {
    const tok = await getCreatorToken(pay.mp_conta_user);
    if (!tok) {
      await supabase.rpc("rifa_cancelar_proprio", { p_pagamento: info.pagamento_id });
      return {
        ok: false,
        error: "Pagamento desta rifa indisponível no momento. Tente mais tarde.",
      };
    }
    accessToken = tok;
  }

  // 2) Gera o Pix no Mercado Pago (na conta certa).
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
      accessToken,
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

// Inicia o pagamento da TAXA de criação (Pix na nossa conta). Vira crédito.
export async function iniciarTaxa(): Promise<ActionResult<PixPagamento>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Entre para continuar." };

  const { data: ini, error: e1 } = await supabase.rpc("rifa_iniciar_taxa");
  if (e1) return { ok: false, error: e1.message };
  const info = ini as { pagamento_id: string; valor: number };

  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get("origin") || "";
    const pix = await criarPagamentoPix({
      valor: info.valor,
      descricao: "FlawSkins · taxa de criação de rifa",
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
        valor: info.valor,
        qrBase64: pix.qr_base64,
        copiaCola: pix.qr_copia,
        numeros: [],
      },
    };
  } catch (err) {
    await supabase.rpc("rifa_cancelar_proprio", { p_pagamento: info.pagamento_id });
    return { ok: false, error: err instanceof Error ? err.message : "Falha no Pix." };
  }
}

// Cria a rifa consumindo 1 crédito (exige MP conectado + crédito).
export async function criarRifaUsuario(
  input: NovaRifa
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rifa_criar_com_credito", {
    p_titulo: input.titulo,
    p_premio: input.premio,
    p_descricao: input.descricao ?? "",
    p_image_url: input.image_url ?? "",
    p_preco: input.preco_cota,
    p_total: input.total_numeros,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/rifas");
  return { ok: true, data: { id: (data as { id: string }).id } };
}

// Estado do criador: tem MP conectado? quantos créditos?
export async function meuPainelRifa(): Promise<{
  creditos: number;
  mp_conectado: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { creditos: 0, mp_conectado: false };
  const { data } = await supabase
    .from("profiles")
    .select("creditos_rifa,mp_conectado")
    .eq("id", user.id)
    .maybeSingle<{ creditos_rifa: number; mp_conectado: boolean }>();
  return {
    creditos: data?.creditos_rifa ?? 0,
    mp_conectado: data?.mp_conectado ?? false,
  };
}

export type Participante = {
  user_id: string;
  nome: string | null;
  numeros: number[];
  pagos: number;
};

// Quem comprou cotas (nome + números).
export async function listarParticipantes(
  rifaId: string
): Promise<Participante[]> {
  const supabase = await createClient();
  const { data: nums } = await supabase
    .from("rifa_numeros")
    .select("numero,user_id,status")
    .eq("rifa_id", rifaId)
    .order("numero", { ascending: true })
    .returns<{ numero: number; user_id: string; status: string }[]>();
  if (!nums || nums.length === 0) return [];

  const ids = [...new Set(nums.map((n) => n.user_id))];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id,nome")
    .in("id", ids);
  const nameMap = new Map((profs ?? []).map((p) => [p.id, p.nome as string | null]));

  const map = new Map<string, Participante>();
  for (const n of nums) {
    let p = map.get(n.user_id);
    if (!p) {
      p = { user_id: n.user_id, nome: nameMap.get(n.user_id) ?? null, numeros: [], pagos: 0 };
      map.set(n.user_id, p);
    }
    p.numeros.push(n.numero);
    if (n.status === "pago") p.pagos++;
  }
  return [...map.values()].sort((a, b) => b.numeros.length - a.numeros.length);
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
  // Admin OU o próprio criador (validado na RPC).
  const supabase = await createClient();
  const { error } = await supabase.rpc("rifa_encerrar", { p_rifa: rifaId });
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
