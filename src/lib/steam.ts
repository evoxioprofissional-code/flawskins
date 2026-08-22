// Helpers para login com Steam (OpenID 2.0) e leitura do inventário público.
// A Steam não usa OIDC moderno — é OpenID 2.0, validado por POST de volta.

const OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";

// Monta a URL de redirecionamento para o usuário se autenticar na Steam.
export function steamLoginUrl(origin: string): string {
  const returnTo = `${origin}/api/steam/callback`;
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${OPENID_ENDPOINT}?${params.toString()}`;
}

// Valida a resposta da Steam e devolve o steamid64 (ou null se inválido).
export async function steamVerify(
  query: URLSearchParams
): Promise<string | null> {
  const claimed = query.get("openid.claimed_id");
  if (!claimed) return null;

  // Reenvia tudo de volta à Steam pedindo confirmação de autenticidade.
  const body = new URLSearchParams();
  for (const [k, v] of query.entries()) body.set(k, v);
  body.set("openid.mode", "check_authentication");

  const res = await fetch(OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!/is_valid\s*:\s*true/i.test(text)) return null;

  const m = claimed.match(/\/openid\/id\/(\d{17})$/);
  return m ? m[1] : null;
}

export type SteamPerfil = { nome: string; avatar: string | null };

// Nome e avatar do jogador. Usa a Steam Web API (confiável p/ servidor) quando
// há STEAM_API_KEY; senão cai no XML público do perfil.
export async function steamPerfil(steamId: string): Promise<SteamPerfil> {
  const key = process.env.STEAM_API_KEY;
  if (key) {
    try {
      const r = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`,
        { cache: "no-store" }
      );
      if (r.ok) {
        const j = (await r.json()) as {
          response?: { players?: { personaname?: string; avatarfull?: string }[] };
        };
        const p = j.response?.players?.[0];
        if (p) {
          return {
            nome: p.personaname || `Jogador ${steamId.slice(-4)}`,
            avatar: p.avatarfull || null,
          };
        }
      }
    } catch {
      // cai no fallback XML abaixo
    }
  }

  try {
    const res = await fetch(
      `https://steamcommunity.com/profiles/${steamId}?xml=1`,
      { headers: { "User-Agent": "CloudSkins/1.0" } }
    );
    const xml = await res.text();
    const nome = matchCdata(xml, "steamID");
    const avatar = matchCdata(xml, "avatarFull");
    return {
      nome: nome || `Jogador ${steamId.slice(-4)}`,
      avatar: avatar || null,
    };
  } catch {
    return { nome: `Jogador ${steamId.slice(-4)}`, avatar: null };
  }
}

function matchCdata(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`);
  const m = xml.match(re);
  if (m) return m[1].trim();
  const re2 = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m2 = xml.match(re2);
  return m2 ? m2[1].trim() : null;
}

// Email determinístico interno para a conta Steam (sem confirmação real).
export function steamEmail(steamId: string): string {
  return `steam-${steamId}@steam.visionskins.net`;
}

// ---- Inventário CS2 (appid 730) ----
import type { Categoria, Exterior } from "@/types/database";

export type ItemInventario = {
  assetId: string;
  titulo: string;
  categoria: Categoria;
  exterior: Exterior;
  image: string;
  inspectLink: string | null;
};

// Carrega o status HTTP da Steam pra sabermos a causa real (privado x limite).
export class SteamInvError extends Error {
  status: number;
  constructor(status: number) {
    super(`steam_inventario_${status}`);
    this.status = status;
  }
}

// Desgaste (campo `wear` da SteamWebAPI) → nome completo do nosso enum.
const WEAR_TO_EXT: Record<string, Exterior> = {
  fn: "Factory New",
  mw: "Minimal Wear",
  ft: "Field-Tested",
  ww: "Well-Worn",
  bs: "Battle-Scarred",
};

// Tipo interno da Steam (tag) → nossa categoria.
const TIPO_INTERNO_PARA_CATEGORIA: Record<string, Categoria> = {
  CSGO_Type_Knife: "Faca",
  CSGO_Type_Hands: "Luva",
  CSGO_Type_Rifle: "Rifle",
  CSGO_Type_Pistol: "Pistola",
  CSGO_Type_SMG: "SMG",
  CSGO_Type_SniperRifle: "Sniper",
  CSGO_Type_Machinegun: "Outro",
  CSGO_Type_Shotgun: "Outro",
};

type SwaInvTag = { category?: string; internal_name?: string };
type SwaInvItem = {
  markethashname?: string;
  assetid?: string;
  image?: string;
  wear?: string;
  tags?: SwaInvTag[];
  inspectlinkparsed?: string;
  inspectlink?: string;
};

// Lê o inventário CS2 via SteamWebAPI (os servidores deles puxam da Steam e
// cacheiam — evita o 429 que a Steam dá direto pro nosso IP). Só skins com
// desgaste (armas/facas/luvas). Requer STEAMWEBAPI_KEY.
export async function steamInventario(steamId: string): Promise<ItemInventario[]> {
  const key = process.env.STEAMWEBAPI_KEY;
  if (!key) throw new SteamInvError(0);

  const url =
    `https://www.steamwebapi.com/steam/api/inventory?key=${key}` +
    `&steam_id=${steamId}&game=cs2&parse=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "CloudSkins/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new SteamInvError(res.status);

  const raw = (await res.json()) as unknown;
  // Erro (rate limit / privado): não vem array.
  if (!Array.isArray(raw)) {
    const msg = String((raw as { error?: string })?.error ?? "").toLowerCase();
    if (/private|privado/.test(msg)) throw new SteamInvError(403);
    if (/limit|rate|too many|requests/.test(msg)) throw new SteamInvError(429);
    throw new SteamInvError(500);
  }

  const itens: ItemInventario[] = [];
  const vistos = new Set<string>();
  for (const it of raw as SwaInvItem[]) {
    const ext = it.wear ? WEAR_TO_EXT[it.wear.toLowerCase()] : undefined;
    if (!ext) continue; // sem desgaste = não é skin (agente/adesivo/caixa)
    if (!it.assetid || !it.markethashname) continue;

    // Evita listar duas skins idênticas.
    const dedup = it.markethashname;
    if (vistos.has(dedup)) continue;
    vistos.add(dedup);

    const tipoInterno =
      it.tags?.find((t) => t.category === "Type")?.internal_name ?? "";
    let categoria = TIPO_INTERNO_PARA_CATEGORIA[tipoInterno] ?? "Outro";
    // Fallback: luvas às vezes não vêm com o tipo padrão.
    if (categoria === "Outro" && /\bgloves\b|hand wraps/i.test(it.markethashname)) {
      categoria = "Luva";
    }

    itens.push({
      assetId: it.assetid,
      titulo: it.markethashname,
      categoria,
      exterior: ext,
      image: it.image ?? "",
      inspectLink: it.inspectlinkparsed || it.inspectlink || null,
    });
  }
  return itens;
}
