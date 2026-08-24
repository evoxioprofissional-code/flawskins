import { NextResponse, type NextRequest } from "next/server";

import { steamLoginUrl, origemDaReq } from "@/lib/steam";

export const runtime = "nodejs";

// Inicia o login com Steam: guarda o destino e manda pro OpenID da Steam.
export async function GET(req: NextRequest) {
  const origin = origemDaReq(req);
  const next = req.nextUrl.searchParams.get("next") || "/";

  const res = NextResponse.redirect(steamLoginUrl(origin));
  res.cookies.set("steam_next", next, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
