"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
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
