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

// Nome e avatar do jogador, sem precisar de API key (XML público do perfil).
export async function steamPerfil(steamId: string): Promise<SteamPerfil> {
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
