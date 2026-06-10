"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { anuncioSchema } from "@/lib/schemas";
import { CATEGORIAS, type Anuncio, type Categoria } from "@/types/database";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const BUCKET = "skins";

// Extensão a partir do content-type (sem restringir formatos).
function extFromType(type: string): string {
  const sub = (type.split("/")[1] || "jpg").toLowerCase();
  if (sub === "jpeg") return "jpg";
  return sub.replace(/[^a-z0-9]/g, "") || "jpg";
}

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
  };

  const parsed = anuncioSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return { ok: false, error: first };
  }

  // Imagens (uma ou mais) — sem limite de peso/dimensões.
  const imagens = formData
    .getAll("imagens")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (imagens.length === 0) {
    return { ok: false, error: "Adicione pelo menos uma imagem da skin." };
  }

  const values = parsed.data;
  const supabase = await createClient();

  // Exige usuário logado (a RLS também bloqueia, mas falhamos cedo e claro).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Faça login para anunciar." };
  }

  // 1) Upload de todas as imagens
  const paths: string[] = [];
  const urls: string[] = [];
  for (const img of imagens) {
    const path = `${user.id}/${crypto.randomUUID()}.${extFromType(img.type)}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, img, { contentType: img.type, upsert: false });
    if (uploadError) {
      // Limpa o que já subiu antes de falhar.
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      return { ok: false, error: `Falha ao enviar a imagem: ${uploadError.message}` };
    }
    paths.push(path);
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }

  // 2) Insert da linha (capa = 1ª imagem)
  const { data, error } = await supabase
    .from("anuncios")
    .insert({
      titulo: values.titulo,
      categoria: values.categoria,
      exterior: values.exterior,
      preco: values.preco,
      whatsapp: values.whatsapp,
      image_url: urls[0],
      image_urls: urls,
      user_id: user.id,
      vendedor_nome: values.vendedor_nome,
      cidade: values.cidade ?? null,
      float_val: values.float_val ?? null,
      phase: values.phase ?? null,
    })
    .select("*")
    .single<Anuncio>();

  if (error) {
    // Best-effort: remove as imagens órfãs se o insert falhar.
    await supabase.storage.from(BUCKET).remove(paths);
    return { ok: false, error: `Falha ao salvar o anúncio: ${error.message}` };
  }

  revalidatePath("/");
  return { ok: true, data };
}

// Lista os anúncios ativos para o feed, com busca e filtro opcionais.
export async function listarAnuncios(filtros?: {
  q?: string;
  categoria?: string;
}): Promise<Anuncio[]> {
  const supabase = await createClient();
  let query = supabase
    .from("anuncios")
    .select("*")
    .eq("status", "ativo")
    .order("created_at", { ascending: false });

  const q = filtros?.q?.trim();
  if (q) query = query.ilike("titulo", `%${q}%`);

  const categoria = filtros?.categoria?.trim();
  if (categoria && (CATEGORIAS as readonly string[]).includes(categoria)) {
    query = query.eq("categoria", categoria as Categoria);
  }

  const { data, error } = await query.returns<Anuncio[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Anúncios do usuário logado (todos os status) — para a página de perfil.
export async function meusAnuncios(): Promise<Anuncio[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("anuncios")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Anuncio[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

// Exclui um anúncio do próprio usuário (RLS garante a posse).
export async function excluirAnuncio(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("anuncios").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/perfil");
  revalidatePath("/");
  return { ok: true, data: null };
}

// Alterna o status entre ativo/vendido (RLS garante a posse).
export async function alternarVendido(
  id: string,
  vendido: boolean
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("anuncios")
    .update({ status: vendido ? "vendido" : "ativo" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/perfil");
  revalidatePath("/");
  return { ok: true, data: null };
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
