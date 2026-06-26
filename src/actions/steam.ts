"use server";

import { createClient } from "@/lib/supabase/server";
import { steamInventario, type ItemInventario } from "@/lib/steam";
import type { ActionResult } from "@/actions/anuncios";

// Inventário CS2 do usuário logado (precisa ter entrado com a Steam).
export async function inventarioSteam(): Promise<ActionResult<ItemInventario[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Entre para continuar." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("steam_id")
    .eq("id", user.id)
    .maybeSingle<{ steam_id: string | null }>();

  const steamId = perfil?.steam_id;
  if (!steamId) {
    return { ok: false, error: "Entre com a Steam para importar seu inventário." };
  }

  try {
    const itens = await steamInventario(steamId);
    return { ok: true, data: itens };
  } catch {
    return {
      ok: false,
      error:
        "Não consegui ler seu inventário. Deixe-o público nas configurações de privacidade da Steam e tente de novo.",
    };
  }
}

// Float de uma skin a partir do inspect link (via CSFloat). null se não der.
export async function floatDaSkin(inspectLink: string): Promise<number | null> {
  try {
    const r = await fetch(
      `https://api.csfloat.com/?url=${encodeURIComponent(inspectLink)}`,
      { headers: { "User-Agent": "VisionSkins/1.0" }, cache: "no-store" }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { iteminfo?: { floatvalue?: number } };
    const f = j.iteminfo?.floatvalue;
    return typeof f === "number" ? Number(f.toFixed(6)) : null;
  } catch {
    return null;
  }
}
