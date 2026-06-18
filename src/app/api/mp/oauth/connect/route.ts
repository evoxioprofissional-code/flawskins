import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import { oauthAuthUrl } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inicia a conexão da conta Mercado Pago do usuário.
export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/perfil`);
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(oauthAuthUrl(state));
  res.cookies.set("mp_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
