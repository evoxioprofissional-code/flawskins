"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { perfilSchema } from "@/lib/schemas";
import type { ActionResult } from "@/actions/anuncios";
import type { Profile } from "@/types/database";

// Busca um perfil por id (público).
export async function buscarPerfil(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle<Profile>();
  if (error) throw new Error(error.message);
  return data;
}

// A foto já vem como URL (upload feito no navegador, ver lib/upload.ts).
export type PerfilInput = {
  nome: string;
  regiao?: string;
  whatsapp?: string;
  avatarUrl?: string;
};

// Atualiza o perfil do usuário logado (nome, região, whatsapp e foto).
export async function atualizarPerfil(
  input: PerfilInput
): Promise<ActionResult<Profile>> {
  const parsed = perfilSchema.safeParse({
    nome: input.nome,
    regiao: input.regiao,
    whatsapp: input.whatsapp,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login." };

  // Valida a URL do avatar, se enviada.
  const avatarUrl = input.avatarUrl;
  if (avatarUrl) {
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`;
    if (!avatarUrl.startsWith(base)) {
      return { ok: false, error: "Imagem inválida." };
    }
  }

  const { nome, regiao, whatsapp } = parsed.data;
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      nome,
      regiao: regiao || null,
      whatsapp: whatsapp || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single<Profile>();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/perfil");
  return { ok: true, data };
}
