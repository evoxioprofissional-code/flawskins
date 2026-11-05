// Webhooks da NexusPag — verificação HMAC, idempotência e roteamento de eventos.
//
// Módulo puro (só node:crypto): não conhece Next nem Supabase, para poder ser
// testado com eventos simulados (tests/nexuspag-webhook.test.mjs).
//
// Contrato (https://nexuspag.com/docs/webhook-payment):
// - Header X-Webhook-Signature: "t=<unix>,v1=<hmac_hex>"
// - v1 = HMAC-SHA256(webhook_secret, "<unix>.<corpo_cru>") em hex
// - Header X-Webhook-Event: nome do evento
// - Qualquer 2xx confirma; 4xx encerra as tentativas; 5xx/timeout reenviam.
//
// Nesta etapa NENHUM evento movimenta dinheiro: os handlers só classificam e
// registram. Créditos, saques e estornos reais entram numa etapa posterior.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SUPPORTED_EVENTS = [
  "payment.confirmed",
  "cashout.success",
  "cashout.failed",
  "refund.completed",
] as const;
export type SupportedEvent = (typeof SUPPORTED_EVENTS)[number];

export const DEFAULT_TOLERANCE_SECONDS = 300;
export const MAX_BODY_BYTES = 256 * 1024;

// ---------------------------------------------------------------------------
// Assinatura
// ---------------------------------------------------------------------------

export type ParsedSignature = { timestamp: number; signatures: string[] };

/** "t=1700000000,v1=abc,v1=def" → { timestamp, signatures: ["abc","def"] }. */
export function parseSignatureHeader(header: string | null | undefined): ParsedSignature | null {
  if (!header) return null;
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (key === "t" && /^\d{1,12}$/.test(value)) timestamp = Number(value);
    else if (key === "v1" && /^[0-9a-f]{64}$/i.test(value)) signatures.push(value.toLowerCase());
  }
  if (timestamp === null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

/** v1 esperado para um timestamp e corpo cru. */
export function computeSignature(timestamp: number, rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

/** Monta um header válido (testes e script de teste local). */
export function buildSignatureHeader(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  return `t=${timestamp},v1=${computeSignature(timestamp, rawBody, secret)}`;
}

export type SignatureCheck =
  | { ok: true; timestamp: number }
  | { ok: false; reason: "missing_header" | "malformed_header" | "timestamp_out_of_window" | "signature_mismatch" };

export function verifySignature(opts: {
  rawBody: string;
  header: string | null | undefined;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): SignatureCheck {
  if (!opts.header) return { ok: false, reason: "missing_header" };
  const parsed = parseSignatureHeader(opts.header);
  if (!parsed) return { ok: false, reason: "malformed_header" };

  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = opts.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (Math.abs(now - parsed.timestamp) > tolerance) return { ok: false, reason: "timestamp_out_of_window" };

  const expected = Buffer.from(computeSignature(parsed.timestamp, opts.rawBody, opts.secret), "hex");
  // Aceita qualquer v1 válido (permite rotação de segredo do lado deles).
  const match = parsed.signatures.some((sig) => {
    const got = Buffer.from(sig, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
  return match ? { ok: true, timestamp: parsed.timestamp } : { ok: false, reason: "signature_mismatch" };
}

// ---------------------------------------------------------------------------
// Evento
// ---------------------------------------------------------------------------

export type NormalizedEvent = {
  name: string;
  supported: boolean;
  /** Chave única do evento: reentregas geram a mesma chave. */
  idempotencyKey: string;
  /** ID do recurso afetado (transação, saque, estorno), se identificado. */
  resourceId: string | null;
  payload: Record<string, unknown>;
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : typeof v === "number" && Number.isFinite(v) ? String(v) : null;

/** Primeiro ID disponível, na ordem de preferência de cada evento. */
function resourceIdFor(name: string, p: Record<string, unknown>): string | null {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = str(p[k]);
      if (v) return v;
    }
    return null;
  };
  switch (name) {
    case "payment.confirmed":
      return pick("transaction_id", "txid", "external_id", "id");
    case "cashout.success":
    case "cashout.failed":
      return pick("withdrawal_id", "id", "correlation_id", "transaction_id", "gateway_txid");
    case "refund.completed":
      return pick("refund_id", "id", "transaction_id", "txid");
    default:
      return pick("payment_id", "transaction_id", "id");
  }
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export type ParseResult =
  | { ok: true; event: NormalizedEvent }
  | { ok: false; reason: "invalid_json" | "missing_event" | "event_mismatch" };

export function parseEvent(rawBody: string, headerEvent: string | null | undefined): ParseResult {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, reason: "invalid_json" };
  const payload = body as Record<string, unknown>;

  const fromBody = str(payload.event);
  const fromHeader = headerEvent?.trim() || null;
  if (fromBody && fromHeader && fromBody !== fromHeader) return { ok: false, reason: "event_mismatch" };
  const name = fromBody ?? fromHeader;
  if (!name) return { ok: false, reason: "missing_event" };

  const resourceId = resourceIdFor(name, payload);
  // Preferência: event_id explícito → evento+recurso → hash do corpo (só deduplica reentrega idêntica).
  const eventId = str(payload.event_id);
  const idempotencyKey = eventId
    ? `${name}:evt:${eventId}`
    : resourceId
      ? `${name}:${resourceId}`
      : `${name}:sha256:${sha256Hex(rawBody)}`;

  return {
    ok: true,
    event: {
      name,
      supported: (SUPPORTED_EVENTS as readonly string[]).includes(name),
      idempotencyKey,
      resourceId,
      payload,
    },
  };
}

// ---------------------------------------------------------------------------
// Handlers (preparados — sem efeitos financeiros nesta etapa)
// ---------------------------------------------------------------------------

export type HandlerOutcome = { action: string; note: string };

/**
 * Por enquanto cada handler só descreve o que FARÁ. Nenhum crédito, depósito,
 * saque ou estorno é executado. Ao implementar, cada um deve ser idempotente
 * por conta própria (o evento pode chegar fora de ordem).
 */
export const HANDLERS: Record<SupportedEvent, (e: NormalizedEvent) => HandlerOutcome> = {
  "payment.confirmed": (e) => ({
    action: "registrado",
    note: `Pagamento ${e.resourceId ?? "?"} confirmado. Crédito ainda não implementado.`,
  }),
  "cashout.success": (e) => ({
    action: "registrado",
    note: `Saque ${e.resourceId ?? "?"} concluído (reconciliado com carteira_saques).`,
  }),
  "cashout.failed": (e) => ({
    action: "registrado",
    note: `Saque ${e.resourceId ?? "?"} falhou (reconciliado com carteira_saques; saldo devolvido se for nosso).`,
  }),
  "refund.completed": (e) => ({
    action: "registrado",
    note: `Estorno ${e.resourceId ?? "?"} concluído. Ajuste de saldo ainda não implementado.`,
  }),
};

// ---------------------------------------------------------------------------
// Orquestração (usada pela rota; testável com um store em memória)
// ---------------------------------------------------------------------------

export type StoredEvent = {
  idempotency_key: string;
  event: string;
  resource_id: string | null;
  supported: boolean;
  status: "registrado" | "ignorado";
  note: string;
  signature_timestamp: string; // ISO UTC
  body_sha256: string;
  payload: Record<string, unknown>;
};

export interface EventStore {
  /** Grava o evento; "duplicate" se a idempotency_key já existir. Lança em falha de infraestrutura. */
  insert(record: StoredEvent): Promise<"inserted" | "duplicate">;
}

export type WebhookResult = { status: number; body: Record<string, unknown> };

export async function processWebhook(opts: {
  rawBody: string;
  signatureHeader: string | null;
  eventHeader: string | null;
  secret: string | null | undefined;
  store: EventStore | null;
  nowSeconds?: number;
  toleranceSeconds?: number;
  log?: (msg: string) => void;
  /** Efeito após registrar (também em reentregas — deve ser idempotente). Erro → 500 e a NexusPag reenvia. */
  afterStore?: (event: NormalizedEvent) => Promise<string | void>;
}): Promise<WebhookResult> {
  const log = opts.log ?? (() => {});

  // Sem segredo configurado: falha fechada. 503 faz a NexusPag reenviar depois.
  if (!opts.secret) {
    log("NEXUSPAG_WEBHOOK_SECRET ausente — evento recusado");
    return { status: 503, body: { error: "webhook_not_configured" } };
  }
  if (Buffer.byteLength(opts.rawBody, "utf8") > MAX_BODY_BYTES) {
    return { status: 413, body: { error: "payload_too_large" } };
  }

  // 1) Assinatura sobre o corpo CRU, antes de qualquer parse.
  const sig = verifySignature({
    rawBody: opts.rawBody,
    header: opts.signatureHeader,
    secret: opts.secret,
    nowSeconds: opts.nowSeconds,
    toleranceSeconds: opts.toleranceSeconds,
  });
  if (!sig.ok) {
    log(`assinatura rejeitada: ${sig.reason}`);
    // 401 (4xx) encerra as tentativas do lado da NexusPag.
    return { status: 401, body: { error: "invalid_signature", reason: sig.reason } };
  }

  // 2) Evento.
  const parsed = parseEvent(opts.rawBody, opts.eventHeader);
  if (!parsed.ok) {
    log(`evento inválido: ${parsed.reason}`);
    return { status: 400, body: { error: parsed.reason } };
  }
  const e = parsed.event;

  const outcome: HandlerOutcome = e.supported
    ? HANDLERS[e.name as SupportedEvent](e)
    : { action: "ignorado", note: `Evento ${e.name} não tratado por esta integração.` };

  // 3) Registro idempotente.
  if (!opts.store) {
    log("store indisponível (SUPABASE_SERVICE_ROLE_KEY ausente?)");
    return { status: 503, body: { error: "storage_unavailable" } };
  }
  let result: "inserted" | "duplicate";
  try {
    result = await opts.store.insert({
      idempotency_key: e.idempotencyKey,
      event: e.name,
      resource_id: e.resourceId,
      supported: e.supported,
      status: e.supported ? "registrado" : "ignorado",
      note: outcome.note,
      signature_timestamp: new Date(sig.timestamp * 1000).toISOString(),
      body_sha256: sha256Hex(opts.rawBody),
      payload: e.payload,
    });
  } catch (err) {
    log(`falha ao registrar ${e.idempotencyKey}: ${err instanceof Error ? err.message : String(err)}`);
    // 500 => a NexusPag reenvia; a idempotência garante que não duplica.
    return { status: 500, body: { error: "storage_failed" } };
  }

  let efeito: string | void = undefined;
  if (opts.afterStore && e.supported) {
    try {
      efeito = await opts.afterStore(e);
    } catch (err) {
      log(`falha ao aplicar ${e.idempotencyKey}: ${err instanceof Error ? err.message : String(err)}`);
      return { status: 500, body: { error: "apply_failed" } };
    }
  }

  if (result === "duplicate") {
    log(`reentrega: ${e.idempotencyKey}${efeito ? ` (${efeito})` : ""}`);
    return { status: 200, body: { ok: true, duplicate: true, event: e.name } };
  }
  log(`${e.name} ${outcome.action}: ${e.idempotencyKey}${efeito ? ` (${efeito})` : ""}`);
  return { status: 200, body: { ok: true, duplicate: false, event: e.name, action: outcome.action } };
}

/** Store em memória (testes e modo local sem banco). */
export function createMemoryStore(): EventStore & { records: StoredEvent[] } {
  const records: StoredEvent[] = [];
  return {
    records,
    async insert(record) {
      if (records.some((r) => r.idempotency_key === record.idempotency_key)) return "duplicate";
      records.push(record);
      return "inserted";
    },
  };
}
