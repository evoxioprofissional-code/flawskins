"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { anuncioSchema } from "@/lib/schemas";
import type { Anuncio } from "@/types/database";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const BUCKET = "skins";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Cria um anúncio: valida, sobe a imagem para o Storage e insere a linha.
export async function criarAnuncio(
  formData: FormData
): Promise<ActionResult<Anuncio>> {
  // Normaliza opcionais vazios para undefined antes de validar.
  const raw = {
    titulo: formData.get("titulo"),
    categoria: formData.get("categoria"),
    exterior: formData.get("exterior"),
    preco: formData.get("preco"),
    whatsapp: formData.get("whatsapp"),
    vendedor_nome: formData.get("vendedor_nome"),
    cidade: emptyToUndefined(formData.get("cidade")),
    float_val: emptyToUndefined(formData.get("float_val")),
    phase: emptyToUndefined(formData.get("phase")),
    imagem: formData.get("imagem"),
  };

  const parsed = anuncioSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return { ok: false, error: first };
  }

  const values = parsed.data;
  const supabase = await createClient();

  // 1) Upload da imagem
  const ext = EXT_BY_TYPE[values.imagem.type] ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, values.imagem, {
      contentType: values.imagem.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: `Falha ao enviar a imagem: ${uploadError.message}` };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // 2) Insert da linha
  const { data, error } = await supabase
    .from("anuncios")
    .insert({
      titulo: values.titulo,
      categoria: values.categoria,
      exterior: values.exterior,
      preco: values.preco,
      whatsapp: values.whatsapp,
      image_url: publicUrl,
      vendedor_nome: values.vendedor_nome,
      cidade: values.cidade ?? null,
      float_val: values.float_val ?? null,
      phase: values.phase ?? null,
    })
    .select("*")
    .single<Anuncio>();

  if (error) {
    // Best-effort: remove a imagem órfã se o insert falhar.
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: `Falha ao salvar o anúncio: ${error.message}` };
  }

  revalidatePath("/");
  return { ok: true, data };
}

// Lista os anúncios ativos para o feed (mais recentes primeiro).
export async function listarAnuncios(): Promise<Anuncio[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anuncios")
    .select("*")
    .eq("status", "ativo")
    .order("created_at", { ascending: false })
    .returns<Anuncio[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

// Busca um único anúncio por id (página de detalhe).
export async function buscarAnuncio(id: string): Promise<Anuncio | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anuncios")
    .select("*")
    .eq("id", id)
    .maybeSingle<Anuncio>();

  if (error) throw new Error(error.message);
  return data;
}

function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}
