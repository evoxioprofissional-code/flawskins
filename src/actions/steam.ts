"use server";

import { createClient } from "@/lib/supabase/server";
import { steamInventario, SteamInvError, type ItemInventario } from "@/lib/steam";
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
  } catch (e) {
    const status = e instanceof SteamInvError ? e.status : 0;

    // 403 = inventário realmente privado. 429 = a Steam limitou NOSSO servidor
    // (nada a ver com o usuário) — não adianta mandar mexer na privacidade.
    if (status === 403) {
      return {
        ok: false,
        error:
          "Seu inventário está privado. Na Steam: Perfil → Editar perfil → Privacidade → deixe 'Inventário' como Público e tente de novo.",
      };
    }
    if (status === 429) {
      return {
        ok: false,
        error:
          "A Steam está limitando nossas consultas no momento (muita gente importando). Espere ~1 minuto e clique em Atualizar.",
      };
    }
    return {
      ok: false,
      error: `Não consegui falar com a Steam agora${status ? ` (erro ${status})` : ""}. Tente de novo em instantes.`,
    };
  }
}

// NÃO existe float automático de graça: a API pública de inspeção
// (api.csgofloat.com) responde 429 "Bots are temporarily not allowed ...
// due to new rate limits imposed by Valve". Por isso o /novo manda o
// vendedor ao checker do CSFloat pelo inspect link e ele cola o valor.
// Para automatizar de verdade seria preciso um serviço pago ou um bot
// de inspeção próprio (Steam) rodando fora do serverless.
