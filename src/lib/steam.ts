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
      { headers: { "User-Agent": "VisionSkins/1.0" } }
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
import { CATEGORIAS, EXTERIORES } from "@/types/database";
import type { Categoria, Exterior } from "@/types/database";

export type ItemInventario = {
  assetId: string;
  titulo: string;
  categoria: Categoria;
  exterior: Exterior;
  image: string;
};

type SteamTag = { category: string; localized_tag_name?: string; internal_name?: string };
type SteamDesc = {
  classid: string;
  instanceid: string;
  market_hash_name?: string;
  name?: string;
  icon_url?: string;
  marketable?: number;
  tags?: SteamTag[];
};
type SteamAsset = { classid: string; instanceid: string; assetid: string };

const TIPO_PARA_CATEGORIA: Record<string, Categoria> = {
  Knife: "Faca",
  Gloves: "Luva",
  Rifle: "Rifle",
  Pistol: "Pistola",
  SMG: "SMG",
  "Sniper Rifle": "Sniper",
  "Machinegun": "Outro",
  Shotgun: "Outro",
};

function tagValor(tags: SteamTag[] | undefined, categoria: string): string | null {
  const t = tags?.find((x) => x.category === categoria);
  return t?.localized_tag_name ?? t?.internal_name ?? null;
}

// Lê o inventário público de CS2 e devolve só skins com desgaste (armas/facas/luvas).
export async function steamInventario(steamId: string): Promise<ItemInventario[]> {
  // l=english: as tags de desgaste/tipo voltam em inglês ("Factory New",
  // "Rifle"…), batendo com nossos enums. O nome da skin é inglês de qualquer jeito.
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=500`;
  const res = await fetch(url, {
    headers: { "User-Agent": "VisionSkins/1.0" },
    cache: "no-store",
  });
  if (!res.ok) {
    // 403/500 normalmente = inventário privado ou vazio.
    throw new Error("inventario_indisponivel");
  }
  const data = (await res.json()) as {
    assets?: SteamAsset[];
    descriptions?: SteamDesc[];
  };
  if (!data.descriptions || !data.assets) return [];

  const descByKey = new Map<string, SteamDesc>();
  for (const d of data.descriptions) descByKey.set(`${d.classid}_${d.instanceid}`, d);

  const itens: ItemInventario[] = [];
  const vistos = new Set<string>();
  for (const a of data.assets) {
    const d = descByKey.get(`${a.classid}_${a.instanceid}`);
    if (!d) continue;

    const ext = tagValor(d.tags, "Exterior");
    if (!ext || !(EXTERIORES as readonly string[]).includes(ext)) continue; // só skins com desgaste

    // Evita duplicar a mesma skin idêntica (mostra uma de cada).
    const dedup = `${d.classid}_${d.instanceid}`;
    if (vistos.has(dedup)) continue;
    vistos.add(dedup);

    const tipo = tagValor(d.tags, "Type") ?? "";
    const categoria = TIPO_PARA_CATEGORIA[tipo] ??
      ((CATEGORIAS as readonly string[]).includes(tipo) ? (tipo as Categoria) : "Outro");

    itens.push({
      assetId: a.assetid,
      titulo: d.market_hash_name || d.name || "Skin",
      categoria,
      exterior: ext as Exterior,
      image: d.icon_url
        ? `https://community.cloudflare.steamstatic.com/economy/image/${d.icon_url}/360fx360f`
        : "",
    });
  }
  return itens;
}
