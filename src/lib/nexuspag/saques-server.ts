import "server-only";

import { serviceClient } from "@/lib/supabase/admin";
import {
  enviarSaque,
  reconciliarPorHistorico,
  reconciliarPorWebhook,
  type Config,
  type SaqueRegistro,
  type SaqueRepo,
} from "@/lib/nexuspag/saques";
import { nexusPagWithdrawConfigured, nexusPagWithdrawProvider } from "@/lib/nexuspag/withdraw-client";

// Liga as regras puras (saques.ts) ao Supabase (funções da 0027, via
// service-role) e ao cliente real da NexusPag. O envio só acontece com
// NEXUSPAG_WITHDRAW_ENABLED=true — o padrão é DESLIGADO (saque fica na fila).

export function saqueConfig(): Config {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return {
    enabled: process.env.NEXUSPAG_WITHDRAW_ENABLED === "true" && nexusPagWithdrawConfigured(),
    shopId: process.env.NEXUSPAG_WITHDRAW_SHOP_ID?.trim() || null,
    webhookUrl: site ? `${site}/api/webhooks/nexuspag` : undefined,
  };
}

const COLS = "id, user_id, valor, chave_pix, pix_key_type, status, correlation_id, provider_withdrawal_id, enviado_em, precisa_revisao";

function toRegistro(r: Record<string, unknown>): SaqueRegistro {
  return { ...(r as unknown as SaqueRegistro), valor: Number(r.valor) };
}

export function supabaseSaqueRepo(): SaqueRepo | null {
  const sb = serviceClient();
  if (!sb) return null;
  const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw new Error(`${fn}: ${error.message}`);
    return data as T;
  };
  return {
    async get(id) {
      const { data } = await sb.from("carteira_saques").select(COLS).eq("id", id).maybeSingle();
      return data ? toRegistro(data) : null;
    },
    async findByProviderOrCorrelation(providerId, correlationId) {
      for (const [col, v] of [["provider_withdrawal_id", providerId], ["correlation_id", correlationId]] as const) {
        if (!v) continue;
        const { data } = await sb.from("carteira_saques").select(COLS).eq(col, v).maybeSingle();
        if (data) return toRegistro(data);
      }
      return null;
    },
    async listEmAberto() {
      const { data } = await sb.from("carteira_saques").select(COLS).in("status", ["processing"]).order("enviado_em", { ascending: true }).limit(200);
      return (data ?? []).map(toRegistro);
    },
    async claim(id) {
      const data = await rpc<Record<string, unknown> | null>("carteira_saque_reivindicar_envio", { p_saque: id });
      return data ? toRegistro(data) : null;
    },
    async recordDispatch(id, d) {
      await rpc("carteira_saque_registrar_envio", {
        p_saque: id,
        p_provider_id: d.providerId,
        p_provider_status: d.providerStatus,
        p_valor_enviado: d.valorEnviado,
        p_taxa: d.taxa,
        p_revisao: d.revisao,
        p_nota: d.nota,
      });
    },
    refundDifference: (id, valorEnviado) => rpc<number>("carteira_saque_estornar_diferenca", { p_saque: id, p_valor_enviado: valorEnviado }),
    complete: (id, providerId, taxa) => rpc<string>("carteira_saque_concluir", { p_saque: id, p_provider_id: providerId, p_taxa: taxa }),
    fail: (id, motivo) => rpc<string>("carteira_saque_falhar", { p_saque: id, p_motivo: motivo }),
    async markReview(id, motivo) {
      await rpc("carteira_saque_marcar_revisao", { p_saque: id, p_motivo: motivo });
    },
    async providerIdsVinculados(ids) {
      if (ids.length === 0) return new Set<string>();
      const { data, error } = await sb.from("carteira_saques").select("provider_withdrawal_id").in("provider_withdrawal_id", ids);
      if (error) throw new Error(error.message);
      return new Set((data ?? []).map((r) => r.provider_withdrawal_id as string));
    },
  };
}

/** Tenta enviar um saque recém-criado (no-op se o envio estiver desligado). */
export async function despacharSaque(saqueId: string) {
  const repo = supabaseSaqueRepo();
  if (!repo) return { estado: "sem_configuracao" as const };
  return enviarSaque({ repo, provider: nexusPagWithdrawProvider, config: saqueConfig(), saqueId });
}

/** Reconciliação pelo histórico da subconta (admin). Nunca reenvia. */
export async function reconciliarSaques() {
  const repo = supabaseSaqueRepo();
  const cfg = saqueConfig();
  if (!repo || !cfg.shopId || !nexusPagWithdrawConfigured()) return null;
  return reconciliarPorHistorico({ repo, provider: nexusPagWithdrawProvider, shopId: cfg.shopId });
}

/** Chamado pela rota de webhook para eventos cashout.* já validados. */
export async function aplicarWebhookDeSaque(evento: { name: string; payload: Record<string, unknown> }) {
  const repo = supabaseSaqueRepo();
  if (!repo) throw new Error("service-role indisponível");
  return reconciliarPorWebhook(repo, evento);
}
