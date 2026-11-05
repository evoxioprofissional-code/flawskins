import "server-only";

import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS, type Anuncio, type Categoria } from "@/types/database";

// Feed do Market em duas etapas, para não trafegar/renderizar tudo de uma vez:
// 1) consulta LEVE (6 colunas) de todos os anúncios que batem com os filtros
//    de banco — usada para contagem, histograma, filtros derivados do título
//    (raridade/pintura) e empilhamento;
// 2) consulta COMPLETA só dos anúncios da página atual.

export const POR_PAGINA = 40;

export type FiltrosFeed = {
  q?: string;
  categoria?: string;
  ordem?: string;
  precoMin?: number;
  precoMax?: number;
  floatMin?: number;
  floatMax?: number;
  exteriores?: string[];
};

export type AnuncioLeve = Pick<Anuncio, "id" | "titulo" | "categoria" | "exterior" | "phase" | "preco">;

const COLUNAS_LEVES = "id, titulo, categoria, exterior, phase, preco";

export async function listarAnunciosLeves(filtros: FiltrosFeed = {}): Promise<AnuncioLeve[]> {
  const supabase = await createClient();
  let query = supabase.from("anuncios").select(COLUNAS_LEVES).eq("status", "ativo");

  // Ordenação (padrão: mais recentes) — a ordem final da página vem daqui.
  if (filtros.ordem === "preco_asc") query = query.order("preco", { ascending: true });
  else if (filtros.ordem === "preco_desc") query = query.order("preco", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  // Desempate estável: sem ele, itens com mesmo preço/data trocariam de página.
  query = query.order("id", { ascending: true });

  const q = filtros.q?.trim();
  if (q) query = query.ilike("titulo", `%${q}%`);

  const categoria = filtros.categoria?.trim();
  if (categoria && (CATEGORIAS as readonly string[]).includes(categoria)) {
    query = query.eq("categoria", categoria as Categoria);
  }

  if (filtros.precoMin != null) query = query.gte("preco", filtros.precoMin);
  if (filtros.precoMax != null) query = query.lte("preco", filtros.precoMax);
  if (filtros.floatMin != null) query = query.gte("float_val", filtros.floatMin);
  if (filtros.floatMax != null) query = query.lte("float_val", filtros.floatMax);
  if (filtros.exteriores?.length) query = query.in("exterior", filtros.exteriores);

  const { data, error } = await query.returns<AnuncioLeve[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Anúncios completos de uma página, na mesma ordem dos ids recebidos. */
export async function buscarAnunciosPorIds(ids: string[]): Promise<Anuncio[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anuncios")
    .select("*")
    .in("id", ids)
    .returns<Anuncio[]>();
  if (error) throw new Error(error.message);
  const porId = new Map((data ?? []).map((a) => [a.id, a]));
  return ids.map((id) => porId.get(id)).filter((a): a is Anuncio => Boolean(a));
}

/** Outros anúncios ativos da mesma arma (ex.: "AK-47 | …"), para a página da skin. */
export async function buscarSimilares(arma: string, excluirId: string, limite = 5): Promise<Anuncio[]> {
  const prefixo = arma.trim().replace(/[%_\\]/g, (c) => `\\${c}`);
  if (!prefixo) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anuncios")
    .select("*")
    .eq("status", "ativo")
    .neq("id", excluirId)
    .ilike("titulo", `${prefixo} |%`)
    .order("created_at", { ascending: false })
    .limit(limite)
    .returns<Anuncio[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Página válida (1..total) a partir do parâmetro da URL. */
export function paginaValida(valor: string | undefined, totalPaginas: number): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, totalPaginas));
}
