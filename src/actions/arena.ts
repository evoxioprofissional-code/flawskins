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
  m: MatchMetrics,
  preset?: string
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
    preset: preset ? preset.slice(0, 60) : null,
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

// ---- Pro Player Lab ----

export type PresetUso = { preset: string; usos: number; pct: number };
export type PresetMeu = {
  preset: string;
  best: number;
  media_acc: number | null;
  partidas: number;
};
export type TopPreset = { preset: string | null; pct: number | null; total: number };

export async function getPresetRanking(): Promise<PresetUso[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("arena_preset_ranking");
  if (error) return [];
  return (data ?? []) as PresetUso[];
}

export async function getTopPreset(): Promise<TopPreset> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("arena_top_preset");
  if (error || !data) return { preset: null, pct: null, total: 0 };
  return data as TopPreset;
}

export async function getMyPresetStats(
  userId: string,
  game: ArenaGame
): Promise<PresetMeu[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("arena_my_preset_stats", {
    p_user: userId,
    p_game: game,
  });
  if (error) return [];
  return (data ?? []) as PresetMeu[];
}

export type CommunityCrosshair = {
  id: string;
  user_id: string;
  nome: string;
  config: unknown;
  autor: string | null;
  created_at: string;
};

export async function listComunidade(): Promise<CommunityCrosshair[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("arena_community_crosshairs")
    .select("id,user_id,nome,config,created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error || !data) return [];

  const ids = [...new Set(data.map((d) => d.user_id))];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id,nome")
    .in("id", ids);
  const nomeMap = new Map((profs ?? []).map((p) => [p.id, p.nome as string | null]));

  return data.map((d) => ({
    id: d.id as string,
    user_id: d.user_id as string,
    nome: d.nome as string,
    config: d.config,
    autor: nomeMap.get(d.user_id as string) ?? null,
    created_at: d.created_at as string,
  }));
}

export async function salvarCrosshair(
  nome: string,
  config: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const n = nome.trim();
  if (n.length < 2 || n.length > 40) {
    return { ok: false, error: "Dê um nome de 2 a 40 caracteres." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login para salvar miras." };

  const { data, error } = await supabase
    .from("arena_community_crosshairs")
    .insert({ user_id: user.id, nome: n, config })
    .select("id")
    .single<{ id: string }>();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/arena/pro-lab");
  return { ok: true, data: { id: data.id } };
}

// Exclui uma mira da comunidade (a RLS garante que só o dono apaga).
export async function excluirCrosshair(
  id: string
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("arena_community_crosshairs")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/arena/pro-lab");
  return { ok: true, data: null };
}
