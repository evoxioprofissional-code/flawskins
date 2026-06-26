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
