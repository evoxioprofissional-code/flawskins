"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { perfilSchema } from "@/lib/schemas";
import type { ActionResult } from "@/actions/anuncios";
import type { Profile } from "@/types/database";

const AVATAR_BUCKET = "avatars";

function extFromType(type: string): string {
  const sub = (type.split("/")[1] || "jpg").toLowerCase();
  if (sub === "jpeg") return "jpg";
  return sub.replace(/[^a-z0-9]/g, "") || "jpg";
}

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

// Atualiza o perfil do usuário logado (nome, região, whatsapp e foto).
export async function atualizarPerfil(
  formData: FormData
): Promise<ActionResult<Profile>> {
  const parsed = perfilSchema.safeParse({
    nome: formData.get("nome"),
    regiao: formData.get("regiao"),
    whatsapp: formData.get("whatsapp"),
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

  // Upload do avatar (opcional) — sem limite de peso ou dimensões.
  let avatarUrl: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const path = `${user.id}/${Date.now()}.${extFromType(avatar.type)}`;
    const { error: upErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, avatar, { contentType: avatar.type, upsert: true });
    if (upErr) {
      return { ok: false, error: `Falha no upload da foto: ${upErr.message}` };
    }
    avatarUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
      .data.publicUrl;
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
