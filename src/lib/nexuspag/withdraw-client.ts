import "server-only";

import type { CreateResult, ProviderWithdrawal, WithdrawProvider } from "@/lib/nexuspag/saques";

// Cliente HTTP da NexusPag SÓ para saques. Usa exclusivamente
// NEXUSPAG_WITHDRAW_API_KEY (separada das demais credenciais) e nunca é
// importado no client. Sem retry: uma chamada = uma tentativa.

const BASE = "https://nexuspag.com";
const TIMEOUT_MS = 15_000;

function apiKey(): string | null {
  const k = process.env.NEXUSPAG_WITHDRAW_API_KEY?.trim();
  return k ? k : null;
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const key = apiKey();
  if (!key) throw new Error("NEXUSPAG_WITHDRAW_API_KEY ausente");
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: { "x-api-key": key, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

export function nexusPagWithdrawConfigured(): boolean {
  return apiKey() !== null;
}

export const nexusPagWithdrawProvider: WithdrawProvider = {
  async getShop(shopId) {
    try {
      const r = await call(`/api/shops/${encodeURIComponent(shopId)}`);
      if (!r.ok) return { ok: false, httpStatus: r.status };
      const j = (await r.json()) as { shop?: { is_active?: unknown; wallet_balance?: unknown } };
      return { ok: true, isActive: j.shop?.is_active === true, walletBalance: num(j.shop?.wallet_balance) ?? 0 };
    } catch {
      return { ok: false, httpStatus: null };
    }
  },

  async createWithdrawal(shopId, body): Promise<CreateResult> {
    let r: Response;
    try {
      r = await call(`/api/shops/${encodeURIComponent(shopId)}/withdraw`, { method: "POST", body: JSON.stringify(body) });
    } catch (e) {
      const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      return timeout ? { kind: "timeout" } : { kind: "network", message: e instanceof Error ? e.message : "erro de rede" };
    }
    let j: Record<string, unknown> = {};
    try {
      j = (await r.json()) as Record<string, unknown>;
    } catch {
      /* corpo vazio/não JSON */
    }
    if (!r.ok) return { kind: "http_error", httpStatus: r.status, message: str(j.error) ?? str(j.message) ?? "" };
    return {
      kind: "ok",
      withdrawalId: str(j.withdrawal_id) ?? str(j.id),
      amount: num(j.amount) ?? body.amount,
      fee: num(j.fee),
      status: str(j.status) ?? "processing",
      idempotent: j.idempotent === true,
    };
  },

  async listWithdrawals(shopId, page): Promise<ProviderWithdrawal[]> {
    const r = await call(`/api/shops/${encodeURIComponent(shopId)}/withdrawals?page=${page}&limit=100`);
    if (!r.ok) throw new Error(`histórico de saques indisponível (HTTP ${r.status})`);
    const j = (await r.json()) as { withdrawals?: Record<string, unknown>[] };
    return (j.withdrawals ?? []).map((w) => ({
      id: str(w.id) ?? "",
      amount: num(w.amount) ?? 0,
      fee: num(w.fee),
      status: str(w.status) ?? "",
      pix_key: str(w.pix_key),
      failure_reason: str(w.failure_reason),
      created_at: str(w.created_at),
    })).filter((w) => w.id);
  },
};
