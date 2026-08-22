import { serviceClient } from "@/lib/supabase/admin";

// Preço de referência (Buff163 + Steam) via SteamWebAPI, com cache no banco.
// Plano grátis = 2 req/min, então buscamos sob demanda e guardamos.

const KEY = process.env.STEAMWEBAPI_KEY;
const STALE_MS = 12 * 60 * 60 * 1000; // 12h

export type PrecoRef = { buff: number | null; steam: number | null } | null;

type SwaPrice = { source?: string; price?: number };
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

    const buffRaw = j.prices?.find((p) => p.source === "buff")?.price;
    const buff = typeof buffRaw === "number" ? Number(buffRaw.toFixed(2)) : null;
    const steamRaw = j.pricelatest ?? j.pricemedian;
    const steam = typeof steamRaw === "number" ? Number(steamRaw.toFixed(2)) : null;
    return { buff, steam };
  } catch {
    return null;
  }
}

// Retorna o preço de referência: usa o cache; se faltar/estiver velho, tenta
// atualizar (ignora falha de rate limit e devolve o que tiver).
export async function getPrecoRef(nome: string): Promise<PrecoRef> {
  const sb = serviceClient();
  if (!sb) return null;

  const { data } = await sb
    .from("skin_precos")
    .select("buff, steam, atualizado_em")
    .eq("nome", nome)
    .maybeSingle<{ buff: number | null; steam: number | null; atualizado_em: string }>();

  const velho =
    !data || Date.now() - new Date(data.atualizado_em).getTime() > STALE_MS;

  if (data && !velho) return { buff: data.buff, steam: data.steam };

  const fresco = await buscarNaApi(nome);
  if (fresco) {
    await sb.from("skin_precos").upsert({
      nome,
      buff: fresco.buff,
      steam: fresco.steam,
      atualizado_em: new Date().toISOString(),
    });
    return fresco;
  }

  // Falhou (rate limit / sem chave): devolve o cache antigo se existir.
  return data ? { buff: data.buff, steam: data.steam } : null;
}
