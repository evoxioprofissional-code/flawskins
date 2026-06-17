import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { consultarPagamento } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook do Mercado Pago: confirma/cancela o pagamento de cotas.
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      /* MP às vezes manda só query params */
    }

    const tipo =
      (body.type as string) ||
      url.searchParams.get("type") ||
      url.searchParams.get("topic") ||
      "";
    const mpId =
      (body.data as { id?: string | number } | undefined)?.id?.toString() ||
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      "";

    if (tipo !== "payment" || !mpId) {
      return NextResponse.json({ ignored: true });
    }

    // Verifica o status REAL no Mercado Pago (fonte da verdade).
    const pag = await consultarPagamento(mpId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const secret = process.env.MP_WEBHOOK_SECRET!;

    if (pag.status === "approved") {
      await supabase.rpc("rifa_confirmar_pagamento", {
        p_mp_id: mpId,
        p_secret: secret,
      });
    } else if (
      ["cancelled", "rejected", "refunded", "charged_back"].includes(pag.status)
    ) {
      await supabase.rpc("rifa_cancelar_pagamento", {
        p_mp_id: mpId,
        p_secret: secret,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Responde 200 para o MP não ficar reenviando em loop por erro nosso.
    return NextResponse.json({ ok: false });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
