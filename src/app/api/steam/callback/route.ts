import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { serviceClient } from "@/lib/supabase/admin";
import { steamVerify, steamPerfil, steamEmail } from "@/lib/steam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Retorno do OpenID da Steam: valida, cria/acha o usuário e abre a sessão.
export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const next = req.cookies.get("steam_next")?.value || "/";
  const fail = (motivo: string) =>
    NextResponse.redirect(`${origin}/login?steam=erro&motivo=${motivo}`);

  // 1) Confirma a autenticidade da resposta junto à Steam.
  const steamId = await steamVerify(req.nextUrl.searchParams);
  if (!steamId) return fail("validacao");

  const admin = serviceClient();
  if (!admin) return fail("config");

  // 2) Garante o usuário no Supabase (email determinístico, já confirmado).
  const perfil = await steamPerfil(steamId);
  const email = steamEmail(steamId);
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome: perfil.nome, steam_id: steamId },
  });
  if (createErr && !/already|exists|registered/i.test(createErr.message)) {
    return fail("criar");
  }

  // 3) Gera um magic-link interno para converter em sessão.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) return fail("link");

  // A resposta de sucesso recebe os cookies da nova sessão (escreve no res).
  const res = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          ),
      },
    }
  );

  const { error: otpErr } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (otpErr) return fail("sessao");

  // 4) Já logado: vincula o steamid e completa nome/avatar se vazios.
  await supabase.rpc("steam_vincular", {
    p_steam_id: steamId,
    p_nome: perfil.nome,
    p_avatar: perfil.avatar ?? "",
  });

  res.cookies.delete("steam_next");
  return res;
}
