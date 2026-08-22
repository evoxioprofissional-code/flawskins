import { serviceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Preços de mercado (Buff163, CSFloat, Steam, Skinport...) via SteamWebAPI,
// com cache no banco. Uma chamada já traz TODOS os mercados de uma vez.
// Plano grátis = 2 req/min, então buscamos sob demanda e guardamos.

const KEY = process.env.STEAMWEBAPI_KEY;
const STALE_MS = 12 * 60 * 60 * 1000; // 12h

export type Mercado = { source: string; nome: string; price: number };
export type PrecoRef = {
  buff: number | null;
  steam: number | null;
  mercados: Mercado[];
} | null;

// Nome bonito por mercado.
const LABEL: Record<string, string> = {
  buff: "Buff163",
  csfloat: "CSFloat",
  steam: "Steam",
  skinport: "Skinport",
  dmarket: "Dmarket",
  waxpeer: "Waxpeer",
  youpin: "Youpin",
  tradeit: "Tradeit",
  skinbaron: "Skinbaron",
  haloskins: "HaloSkins",
  skinland: "Skin.Land",
  csgocom: "CSGO.com",
  skinflow: "Skinflow",
  csdeals: "CSDeals",
};

type SwaPrice = { source?: string; name?: string; price?: number };
type SwaItem = {
  error?: string;
  prices?: SwaPrice[];
  pricelatest?: number;
  pricemedian?: number;
};

// Busca na API (1 requisição). null se sem chave / erro / rate limit.
async function buscarNaApi(nome: string): Promise<PrecoRef> {
  if (!KEY) return null;
  try {
    const url =
      `https://www.steamwebapi.com/steam/api/item?key=${KEY}` +
      `&market_hash_name=${encodeURIComponent(nome)}&currency=BRL`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as SwaItem;
    if (j.error) return null;

    const mercados: Mercado[] = [];
    for (const p of j.prices ?? []) {
      if (p.source && typeof p.price === "number" && p.price > 0) {
        mercados.push({
          source: p.source,
          nome: LABEL[p.source] ?? p.name ?? p.source,
          price: Number(p.price.toFixed(2)),
        });
      }
    }
    const steamRaw = j.pricelatest ?? j.pricemedian;
    const steam = typeof steamRaw === "number" ? Number(steamRaw.toFixed(2)) : null;
    if (steam != null) mercados.push({ source: "steam", nome: "Steam", price: steam });

    const buff = mercados.find((m) => m.source === "buff")?.price ?? null;
    return { buff, steam, mercados };
  } catch {
    return null;
  }
}

// Preço de referência: usa o cache; se faltar/estiver velho, tenta atualizar
// (ignora falha de rate limit e devolve o que tiver).
export async function getPrecoRef(nome: string): Promise<PrecoRef> {
  const sb = serviceClient();
  if (!sb) return null;

  const { data } = await sb
    .from("skin_precos")
    .select("buff, steam, mercados, atualizado_em")
    .eq("nome", nome)
    .maybeSingle<{
      buff: number | null;
      steam: number | null;
      mercados: Mercado[] | null;
      atualizado_em: string;
    }>();

  const velho =
    !data || Date.now() - new Date(data.atualizado_em).getTime() > STALE_MS;

  if (data && !velho) {
    return { buff: data.buff, steam: data.steam, mercados: data.mercados ?? [] };
  }

  const fresco = await buscarNaApi(nome);
  if (fresco) {
    await sb.from("skin_precos").upsert({
      nome,
      buff: fresco.buff,
      steam: fresco.steam,
      mercados: fresco.mercados,
      atualizado_em: new Date().toISOString(),
    });
    return fresco;
  }

  return data
    ? { buff: data.buff, steam: data.steam, mercados: data.mercados ?? [] }
    : null;
}

// Leitura em lote do cache (sem chamar a API) — pro selo nos cards da grade.
export async function getPrecosCache(
  nomes: string[]
): Promise<Map<string, number>> {
  const uniq = [...new Set(nomes)].filter(Boolean);
  const mapa = new Map<string, number>();
  if (uniq.length === 0) return mapa;
  const sb = await createClient();
  const { data } = await sb
    .from("skin_precos")
    .select("nome, buff")
    .in("nome", uniq)
    .returns<{ nome: string; buff: number | null }[]>();
  for (const r of data ?? []) if (r.buff != null) mapa.set(r.nome, Number(r.buff));
  return mapa;
}

// Preços pros cards: lê o cache e, pras skins que faltam, busca algumas na API
// (limitado por render por causa do rate limit). Assim a grade se preenche
// sozinha ao longo de poucos carregamentos.
export async function getPrecosGrade(
  nomes: string[],
  limiteBusca = 3
): Promise<Map<string, number>> {
  const mapa = await getPrecosCache(nomes);
  const faltando = [...new Set(nomes)]
    .filter((n) => n && !mapa.has(n))
    .slice(0, limiteBusca);
  for (const nome of faltando) {
    const ref = await getPrecoRef(nome);
    if (ref?.buff != null) mapa.set(nome, ref.buff);
  }
  return mapa;
}
