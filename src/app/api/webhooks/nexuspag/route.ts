import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_TOLERANCE_SECONDS, processWebhook } from "@/lib/nexuspag/webhook";
import { getNexusPagEventStore } from "@/lib/nexuspag/store";
import { aplicarWebhookDeSaque } from "@/lib/nexuspag/saques-server";

// POST /api/webhooks/nexuspag
// Recebe eventos da NexusPag, valida o HMAC sobre o corpo CRU, registra cada
// evento uma única vez e responde. Eventos cashout.* reconciliam o saque
// correspondente (src/lib/nexuspag/saques.ts); pagamentos e estornos ainda só
// são registrados.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tolerance(): number {
  const n = Number(process.env.NEXUSPAG_WEBHOOK_TOLERANCE_SECONDS);
  return Number.isFinite(n) && n >= 30 && n <= 3600 ? n : DEFAULT_TOLERANCE_SECONDS;
}

export async function POST(req: NextRequest) {
  // Corpo cru: a assinatura cobre exatamente estes bytes. Nunca re-serializar.
  const rawBody = await req.text();

  const result = await processWebhook({
    rawBody,
    signatureHeader: req.headers.get("x-webhook-signature"),
    eventHeader: req.headers.get("x-webhook-event"),
    secret: process.env.NEXUSPAG_WEBHOOK_SECRET,
    store: getNexusPagEventStore(),
    toleranceSeconds: tolerance(),
    // Log seguro: só motivo/evento/chave — nunca segredo, header ou payload.
    log: (msg) => console.info(`[nexuspag] ${msg}`),
    // Saques: fecha o saque correspondente (idempotente; só afeta saques criados por nós).
    afterStore: async (e) => {
      if (e.name === "cashout.success" || e.name === "cashout.failed") {
        return `saque: ${await aplicarWebhookDeSaque({ name: e.name, payload: e.payload })}`;
      }
    },
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
