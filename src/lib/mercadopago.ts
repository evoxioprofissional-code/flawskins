// Cliente mínimo do Mercado Pago (Pix) via REST. Server-only.
const BASE = "https://api.mercadopago.com";

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("MP_ACCESS_TOKEN não configurado.");
  return t;
}

export type PixResult = {
  id: string;
  status: string;
  qr_copia: string;
  qr_base64: string;
  ticket_url: string | null;
};

export async function criarPagamentoPix(params: {
  valor: number;
  descricao: string;
  email: string;
  idempotency: string;
  externalReference: string;
  notificationUrl?: string;
  expiraEmMin?: number;
  accessToken?: string; // token do criador (split); default = plataforma
}): Promise<PixResult> {
  const exp = new Date(Date.now() + (params.expiraEmMin ?? 30) * 60_000);

  const body: Record<string, unknown> = {
    transaction_amount: Number(params.valor.toFixed(2)),
    description: params.descricao,
    payment_method_id: "pix",
    payer: { email: params.email },
    external_reference: params.externalReference,
    date_of_expiration: isoComOffset(exp),
  };
  if (params.notificationUrl) body.notification_url = params.notificationUrl;

  const res = await fetch(`${BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken ?? token()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotency,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Falha ao gerar Pix no Mercado Pago.");
  }
  const tx = data?.point_of_interaction?.transaction_data ?? {};
  return {
    id: String(data.id),
    status: data.status,
    qr_copia: tx.qr_code ?? "",
    qr_base64: tx.qr_code_base64 ?? "",
    ticket_url: tx.ticket_url ?? null,
  };
}

export async function consultarPagamento(
  id: string,
  accessToken?: string
): Promise<{ id: string; status: string; external_reference: string | null }> {
  const res = await fetch(`${BASE}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${accessToken ?? token()}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Falha ao consultar pagamento.");
  return {
    id: String(data.id),
    status: data.status,
    external_reference: data.external_reference ?? null,
  };
}

// ---- OAuth (conectar a conta do criador) ----

export function oauthRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  return `${base}/api/mp/oauth/callback`;
}

export function oauthAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID || "",
    response_type: "code",
    platform_id: "mp",
    redirect_uri: oauthRedirectUri(),
    state,
  });
  return `https://auth.mercadopago.com.br/authorization?${params.toString()}`;
}

export type OAuthToken = {
  access_token: string;
  refresh_token: string | null;
  user_id: string | null;
  public_key: string | null;
  expires_in: number | null;
};

export async function oauthExchange(code: string): Promise<OAuthToken> {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: oauthRedirectUri(),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Falha ao conectar Mercado Pago.");
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    user_id: data.user_id ? String(data.user_id) : null,
    public_key: data.public_key ?? null,
    expires_in: data.expires_in ?? null,
  };
}

// Mercado Pago exige data com offset (ex: 2024-01-01T10:00:00.000-03:00).
function isoComOffset(d: Date): string {
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const tz = -d.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const base = d.toISOString().replace("Z", "");
  return `${base}${sign}${pad(tz / 60)}:${pad(tz % 60)}`;
}
