import "server-only";

import { serviceClient } from "@/lib/supabase/admin";
import { createMemoryStore, type EventStore } from "@/lib/nexuspag/webhook";

// Onde os webhooks da NexusPag são registrados.
// - Padrão: tabela public.nexuspag_webhook_eventos via service-role (0026).
// - NEXUSPAG_WEBHOOK_STORE=memory: guarda em memória do processo, para testar
//   em localhost sem banco. IGNORADO em produção.

const UNIQUE_VIOLATION = "23505";

let memory: ReturnType<typeof createMemoryStore> | null = null;

export function getNexusPagEventStore(): EventStore | null {
  if (process.env.NEXUSPAG_WEBHOOK_STORE === "memory" && process.env.NODE_ENV !== "production") {
    memory ??= createMemoryStore();
    return memory;
  }

  const sb = serviceClient();
  if (!sb) return null;

  return {
    async insert(r) {
      const { error } = await sb.from("nexuspag_webhook_eventos").insert({
        idempotency_key: r.idempotency_key,
        evento: r.event,
        recurso_id: r.resource_id,
        suportado: r.supported,
        status: r.status,
        nota: r.note,
        assinatura_em: r.signature_timestamp,
        corpo_sha256: r.body_sha256,
        payload: r.payload,
      });
      if (!error) return "inserted";
      if (error.code === UNIQUE_VIOLATION) return "duplicate";
      throw new Error(error.message);
    },
  };
}
