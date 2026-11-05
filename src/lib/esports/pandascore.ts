import "server-only";

// Cliente HTTP da PandaScore (https://developers.pandascore.co).
// - Token só no servidor (PANDASCORE_TOKEN), enviado como Bearer.
// - Timeout, retry controlado (429/5xx/rede), limite de concorrência e
//   "circuit breaker" simples quando a cota estoura.
// - Cache via Data Cache do Next (`next.revalidate` + tags).
// - Logs seguros: nunca registram token nem headers.

const BASE_URL = "https://api.pandascore.co";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const MAX_CONCURRENT = 4;
/** Não esperamos mais que isso por um Retry-After dentro de um request. */
const MAX_INLINE_WAIT_MS = 3_000;
/** Abaixo desta cota restante, paramos de chamar a API até o reset. */
const LOW_QUOTA = 3;

export type PandaScoreErrorKind =
  | "config" // token ausente
  | "unauthorized" // 401
  | "forbidden" // 403 — recurso fora do plano
  | "not_found" // 404
  | "rate_limited" // 429 / cota esgotada
  | "server" // 5xx
  | "timeout"
  | "network"
  | "invalid_response";

export class PandaScoreError extends Error {
  readonly kind: PandaScoreErrorKind;
  readonly status: number | null;
  constructor(kind: PandaScoreErrorKind, status: number | null, message: string) {
    super(message);
    this.name = "PandaScoreError";
    this.kind = kind;
    this.status = status;
  }
}

export type Query = Record<string, string | number | undefined | null>;

export type RequestOptions = {
  /** Caminho a partir da raiz, ex.: "/csgo/matches/upcoming". */
  path: string;
  query?: Query;
  /** Segundos de cache no Data Cache do Next. 0 = sem cache. */
  revalidate?: number;
  tags?: string[];
  timeoutMs?: number;
};

export type PandaScoreResponse = {
  data: unknown;
  total: number | null;
  page: number | null;
  perPage: number | null;
};

// --- limitador de concorrência (por instância do servidor) -----------------

let active = 0;
const waiting: Array<() => void> = [];
let blockedUntil = 0;

async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
}

function release() {
  active--;
  waiting.shift()?.();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoff(attempt: number) {
  return 300 * 2 ** attempt + Math.floor(Math.random() * 150);
}

function log(level: "warn" | "error", msg: string) {
  // Somente caminho + status; sem querystring sensível, sem token.
  console[level](`[pandascore] ${msg}`);
}

export function isConfigured(): boolean {
  return Boolean(process.env.PANDASCORE_TOKEN);
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, BASE_URL);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  return url;
}

function headerInt(h: Headers, name: string): number | null {
  const v = h.get(name);
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
}

function retryAfterMs(h: Headers): number | null {
  const v = h.get("retry-after");
  if (!v) return null;
  const secs = Number(v);
  if (Number.isFinite(secs)) return secs * 1000;
  const at = Date.parse(v);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : null;
}

export async function pandascoreRequest(opts: RequestOptions): Promise<PandaScoreResponse> {
  const token = process.env.PANDASCORE_TOKEN;
  if (!token) throw new PandaScoreError("config", null, "PANDASCORE_TOKEN não configurado.");

  if (Date.now() < blockedUntil) {
    throw new PandaScoreError("rate_limited", 429, "Limite de requisições da PandaScore atingido.");
  }

  const url = buildUrl(opts.path, opts.query);
  const revalidate = opts.revalidate ?? 60;
  let lastError: PandaScoreError | null = null;

  // Importante: as páginas NÃO podem usar `dynamic = "force-dynamic"`, que força
  // no-store em todo fetch e anula este cache (cada visita voltaria à API).
  const startedAt = Date.now();
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await acquire();
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        ...(revalidate > 0
          ? { next: { revalidate, tags: ["esports", ...(opts.tags ?? [])] } }
          : { cache: "no-store" as const }),
      });
    } catch (e) {
      const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      lastError = new PandaScoreError(
        timeout ? "timeout" : "network",
        null,
        timeout ? "Tempo limite excedido ao consultar a PandaScore." : "Falha de rede ao consultar a PandaScore.",
      );
      log("warn", `${lastError.kind} ${opts.path} (tentativa ${attempt + 1})`);
      if (attempt < MAX_RETRIES) {
        await sleep(backoff(attempt));
        continue;
      }
      throw lastError;
    } finally {
      release();
    }

    const remaining = headerInt(res.headers, "x-rate-limit-remaining");
    if (remaining !== null && remaining <= LOW_QUOTA) {
      // Cota quase no fim: segura novas chamadas por um minuto.
      blockedUntil = Date.now() + 60_000;
      log("warn", `cota baixa (${remaining} restantes) — pausando chamadas por 60s`);
    }

    if (res.ok) {
      let text: string;
      try {
        text = await res.text();
      } catch (e) {
        // Falha lendo o corpo (timeout/conexão caiu no meio): tenta de novo.
        const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
        lastError = new PandaScoreError(timeout ? "timeout" : "network", null, "Falha ao ler a resposta da PandaScore.");
        log("warn", `${lastError.kind} lendo corpo de ${opts.path} (tentativa ${attempt + 1})`);
        if (attempt < MAX_RETRIES) {
          await sleep(backoff(attempt));
          continue;
        }
        throw lastError;
      }
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        log("warn", `JSON inválido em ${opts.path}`);
        throw new PandaScoreError("invalid_response", res.status, "Resposta da PandaScore não é JSON válido.");
      }
      const ms = Date.now() - startedAt;
      if (ms > 1500) log("warn", `lento: ${opts.path} levou ${ms}ms (cache miss)`);
      return {
        data,
        total: headerInt(res.headers, "x-total"),
        page: headerInt(res.headers, "x-page"),
        perPage: headerInt(res.headers, "x-per-page"),
      };
    }

    // Descarta o corpo de erro sem logar (pode conter detalhes da conta).
    await res.body?.cancel().catch(() => {});

    switch (res.status) {
      case 401:
        log("error", `401 ${opts.path} — token inválido ou expirado`);
        throw new PandaScoreError("unauthorized", 401, "Token da PandaScore inválido.");
      case 403:
        log("warn", `403 ${opts.path} — recurso fora do plano atual`);
        throw new PandaScoreError("forbidden", 403, "Recurso não disponível no plano atual da PandaScore.");
      case 404:
        throw new PandaScoreError("not_found", 404, "Registro não encontrado.");
      case 429: {
        const wait = retryAfterMs(res.headers) ?? backoff(attempt);
        lastError = new PandaScoreError("rate_limited", 429, "Limite de requisições da PandaScore atingido.");
        log("warn", `429 ${opts.path} (aguardar ${Math.round(wait / 1000)}s)`);
        if (attempt < MAX_RETRIES && wait <= MAX_INLINE_WAIT_MS) {
          await sleep(wait);
          continue;
        }
        blockedUntil = Date.now() + Math.max(wait, 10_000);
        throw lastError;
      }
      default:
        if (res.status >= 500) {
          lastError = new PandaScoreError("server", res.status, "A PandaScore está instável no momento.");
          log("warn", `${res.status} ${opts.path} (tentativa ${attempt + 1})`);
          if (attempt < MAX_RETRIES) {
            await sleep(backoff(attempt));
            continue;
          }
          throw lastError;
        }
        log("warn", `${res.status} ${opts.path}`);
        throw new PandaScoreError("invalid_response", res.status, `Resposta inesperada (${res.status}).`);
    }
  }

  throw lastError ?? new PandaScoreError("network", null, "Falha ao consultar a PandaScore.");
}

/** Helper de paginação: page/per_page conforme a doc (per_page máx. 100). */
export function pageQuery(page: number, perPage: number): Query {
  const p = Math.max(1, Math.floor(page) || 1);
  const pp = Math.min(100, Math.max(1, Math.floor(perPage) || 20));
  return { page: p, per_page: pp };
}
