import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { oauthExchange } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("mp_oauth_state")?.value;

  const erro = (m: string) =>
    NextResponse.redirect(`${origin}/perfil?mp=erro&motivo=${encodeURIComponent(m)}`);

  if (!code) return erro("sem_code");
  if (!state || state !== cookieState) return erro("state_invalido");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/perfil`);

  try {
    const tok = await oauthExchange(code);

    const { error: e1 } = await supabase.from("mp_contas").upsert(
      {
        user_id: user.id,
        mp_user_id: tok.user_id,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        public_key: tok.public_key,
        expires_at: tok.expires_in
          ? new Date(Date.now() + tok.expires_in * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (e1) return erro(e1.message);

    await supabase.from("profiles").update({ mp_conectado: true }).eq("id", user.id);

    const res = NextResponse.redirect(`${origin}/perfil?mp=ok`);
    res.cookies.delete("mp_oauth_state");
    return res;
  } catch (e) {
    return erro(e instanceof Error ? e.message : "falha");
  }
}
