"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { anuncioSchema } from "@/lib/schemas";
import { CATEGORIAS, type Anuncio, type Categoria } from "@/types/database";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// As imagens já vêm como URLs (upload feito no navegador, ver lib/upload.ts),
// então a Server Action recebe só texto — sem limite de body.
export type NovoAnuncioInput = {
  titulo: string;
  categoria: string;
  exterior: string;
  preco: number | string;
  whatsapp: string;
  vendedor_nome: string;
  cidade?: string;
  float_val?: number | string | null;
  phase?: string;
  imageUrls: string[];
};

// Cria um anúncio: valida os campos e insere a linha (capa = 1ª imagem).
export async function criarAnuncio(
  input: NovoAnuncioInput
): Promise<ActionResult<Anuncio>> {
  const parsed = anuncioSchema.safeParse({
    titulo: input.titulo,
    categoria: input.categoria,
    exterior: input.exterior,
    preco: input.preco,
    whatsapp: input.whatsapp,
    vendedor_nome: input.vendedor_nome,
    cidade: input.cidade || undefined,
    float_val:
      input.float_val === "" || input.float_val == null
        ? undefined
        : input.float_val,
    phase: input.phase || undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return { ok: false, error: first };
  }

  const urls = (input.imageUrls ?? []).filter(
    (u) => typeof u === "string" && u.length > 0
  );
  if (urls.length === 0) {
    return { ok: false, error: "Adicione pelo menos uma imagem da skin." };
  }

  // Segurança: aceitamos imagens do nosso bucket ou do CDN da Steam
  // (skins importadas do inventário entram com a URL oficial da Steam).
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/skins/`;
  const origemOk = (u: string) =>
    u.startsWith(base) || /^https:\/\/[^/]+\.steamstatic\.com\/economy\/image\//.test(u);
  if (!urls.every(origemOk)) {
    return { ok: false, error: "Imagens inválidas." };
  }

  const values = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Faça login para anunciar." };
  }

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
