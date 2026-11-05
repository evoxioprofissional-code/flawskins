import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Match, Team, Tournament } from "./types";

// Persistência no Supabase (tabelas da migration 0023_esports.sql).
// Sempre via service-role (escrita bloqueada por RLS para anon/autenticado).

type Sb = SupabaseClient;

function teamRow(t: Team, game: string) {
  return {
    external_id: t.id,
    game_slug: game,
    name: t.name,
    acronym: t.acronym,
    slug: t.slug,
    location: t.location,
    logo_url: t.logo,
    synced_at: new Date().toISOString(),
  };
}

function matchRow(m: Match, game: string) {
  const [a, b] = m.sides;
  return {
    external_id: m.id,
    game_slug: game,
    tournament_external_id: m.tournament?.id ?? null,
    name: m.name,
    status: m.status,
    provider_status: m.rawStatus,
    scheduled_at: m.scheduledAt,
    begin_at: m.beginAt,
    end_at: m.endAt,
    format: m.format.label,
    number_of_games: m.format.games,
    team_a_external_id: a.team?.id ?? null,
    team_b_external_id: b.team?.id ?? null,
    score_a: a.score,
    score_b: b.score,
    winner_external_id: m.winnerId,
    draw: m.draw,
    forfeit: m.forfeit,
    games: m.games,
    provider_modified_at: m.modifiedAt,
    synced_at: new Date().toISOString(),
  };
}

function tournamentRow(t: Tournament, game: string) {
  return {
    external_id: t.id,
    game_slug: game,
    name: t.name,
    slug: t.slug,
    league_external_id: t.league?.id ?? null,
    league_name: t.league?.name ?? null,
    league_logo_url: t.league?.logo ?? null,
    serie_external_id: t.serie?.id ?? null,
    serie_name: t.serie?.name ?? null,
    tier: t.tier,
    region: t.region,
    prizepool: t.prizepool,
    begin_at: t.beginAt,
    end_at: t.endAt,
    winner_external_id: t.winnerId,
    match_count: t.matchCount,
    provider_modified_at: t.modifiedAt,
    synced_at: new Date().toISOString(),
  };
}

async function upsert(sb: Sb, table: string, rows: object[]): Promise<number> {
  if (!rows.length) return 0;
  const { error } = await sb.from(table).upsert(rows, { onConflict: "external_id" });
  if (error) throw new Error(`${table}: ${error.message}`);
  return rows.length;
}

export async function saveMatches(sb: Sb, matches: Match[], game = "cs2"): Promise<number> {
  const teams = new Map<number, Team>();
  for (const m of matches) for (const s of m.sides) if (s.team) teams.set(s.team.id, s.team);
  await upsert(sb, "esports_teams", [...teams.values()].map((t) => teamRow(t, game)));
  return upsert(sb, "esports_matches", matches.map((m) => matchRow(m, game)));
}

export async function saveTournaments(sb: Sb, tournaments: Tournament[], game = "cs2"): Promise<number> {
  return upsert(sb, "esports_tournaments", tournaments.map((t) => tournamentRow(t, game)));
}

export async function writeSyncLog(
  sb: Sb,
  log: {
    scope: string;
    status: "success" | "partial" | "error";
    received: number;
    upserted: number;
    errorKind?: string | null;
    errorMessage?: string | null;
    startedAt: Date;
  },
) {
  await sb.from("esports_sync_logs").insert({
    scope: log.scope,
    status: log.status,
    items_received: log.received,
    items_upserted: log.upserted,
    error_kind: log.errorKind ?? null,
    error_message: log.errorMessage?.slice(0, 500) ?? null,
    started_at: log.startedAt.toISOString(),
  });
}
