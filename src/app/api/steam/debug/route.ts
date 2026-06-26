import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnóstico do login/inventário Steam para o usuário logado.
// Abra /api/steam/debug no navegador (logado) e veja o JSON.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não logado" }, { status: 401 });

  const { data: perfil } = await supabase
    .from("profiles")
    .select("steam_id, nome, avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ steam_id: string | null; nome: string | null; avatar_url: string | null }>();

  const out: Record<string, unknown> = {
    email: user.email,
    steam_id: perfil?.steam_id ?? null,
    nome: perfil?.nome ?? null,
    avatar_url: perfil?.avatar_url ?? null,
  };

  const steamId = perfil?.steam_id;
  if (!steamId) {
    out.diagnostico = "steam_id NÃO salvo — o vínculo (steam_vincular) falhou.";
    return NextResponse.json(out);
  }

  // Perfil XML (avatar/nome)
  try {
    const r = await fetch(`https://steamcommunity.com/profiles/${steamId}?xml=1`, {
      headers: { "User-Agent": "VisionSkins/1.0" },
      cache: "no-store",
    });
    const txt = await r.text();
    out.perfil_xml = {
      status: r.status,
      tem_avatarFull: /avatarFull/.test(txt),
      amostra: txt.slice(0, 200),
    };
  } catch (e) {
    out.perfil_xml = { erro: e instanceof Error ? e.message : "falha" };
  }

  // Inventário CS2
  try {
    const r = await fetch(
      `https://steamcommunity.com/inventory/${steamId}/730/2?l=portuguese&count=500`,
      { headers: { "User-Agent": "VisionSkins/1.0" }, cache: "no-store" }
    );
    const status = r.status;
    let descricoes = 0;
    let amostra: string | null = null;
    try {
      const j = (await r.json()) as { descriptions?: unknown[] };
      descricoes = j.descriptions?.length ?? 0;
    } catch {
      amostra = (await r.text().catch(() => "")).slice(0, 200);
    }
    out.inventario = { status, descricoes, amostra };
  } catch (e) {
    out.inventario = { erro: e instanceof Error ? e.message : "falha" };
  }

  return NextResponse.json(out);
}
