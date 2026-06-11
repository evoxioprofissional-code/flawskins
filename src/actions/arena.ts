"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/anuncios";
import {
  isArenaGame,
  type ArenaGame,
  type ArenaPeriod,
  type ArenaStats,
  type MatchMetrics,
  type RankingRow,
} from "@/types/arena";

// Faixas plausíveis (espelham o CHECK do banco) — anti-trapaça básico.
function valorValido(game: ArenaGame, valor: number): boolean {
  if (!Number.isFinite(valor)) return false;
  if (game === "reflexo") return valor >= 50 && valor <= 5000;
  return valor >= 0 && valor <= 100000;
}

// Registra o resultado de uma partida e devolve a posição no ranking geral.
export async function registrarScore(
  game: ArenaGame,
  m: MatchMetrics
): Promise<ActionResult<{ posicao: number | null }>> {
  if (!isArenaGame(game) || !valorValido(game, m.valor)) {
    return { ok: false, error: "Resultado inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Entre para pontuar e ranquear." };

  const { data: season } = await supabase.rpc("arena_active_season");

  const { error } = await supabase.from("arena_scores").insert({
    user_id: user.id,
    season_id: season ?? null,
    game,
    valor: Math.round(m.valor),
    accuracy: m.accuracy,
    hits: m.hits,
    misses: m.misses,
    combo: m.combo,
    reacao_media: m.reacao_media,
    dificuldade: m.dificuldade,
  });
  if (error) return { ok: false, error: error.message };

  // Recalcula conquistas a partir dos dados reais.
  await supabase.rpc("arena_sync_achievements");

  const { data: posicao } = await supabase.rpc("arena_position", {
    p_user: user.id,
    p_game: game,
  });

  revalidatePath("/arena");
  revalidatePath("/arena/ranking");
  revalidatePath("/perfil");
  return { ok: true, data: { posicao: posicao ?? null } };
}

// Ranking público por jogo e período.
export async function getRanking(
  game: ArenaGame,
  period: ArenaPeriod
): Promise<RankingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("arena_ranking", {
    p_game: game,
    p_period: period,
  });
  if (error) return [];
  return (data ?? []) as RankingRow[];
}

// Estatísticas da Arena de um usuário (perfil).
export async function getArenaStats(
  userId: string
): Promise<ArenaStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("arena_user_stats", {
    p_user: userId,
  });
  if (error) return null;
  return data as ArenaStats;
}
