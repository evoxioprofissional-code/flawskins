// Validação (zod) + normalização das respostas da PandaScore.
// Módulo puro (sem imports de runtime além do zod) para poder ser testado
// direto com `node --test` (ver tests/esports.test.mjs).

import { z } from "zod";
import type {
  LeagueRef,
  Match,
  MatchFormat,
  MatchGame,
  MatchStatus,
  SerieRef,
  Side,
  Stream,
  Team,
  Tournament,
  TournamentRef,
} from "./types";

// ---------------------------------------------------------------------------
// Schemas — só os campos que usamos. Tudo opcional/nulo: a API omite campos
// conforme o plano e o estado da partida, e preferimos degradar a quebrar.
// ---------------------------------------------------------------------------

const id = z.number().int();
const str = z.string().nullish();
const iso = z.string().nullish();

const teamSchema = z.object({
  id,
  name: z.string(),
  acronym: str,
  slug: str,
  location: str,
  image_url: str,
  dark_mode_image_url: str,
});

const leagueSchema = z.object({ id, name: z.string(), image_url: str });
const serieSchema = z.object({
  id,
  name: str,
  full_name: str,
  season: str,
  year: z.number().nullish(),
});
const tournamentRefSchema = z.object({
  id,
  name: z.string(),
  tier: str,
  region: str,
  type: str,
  prizepool: str,
  begin_at: iso,
  end_at: iso,
});

const gameSchema = z.object({
  id,
  position: z.number().nullish(),
  status: str,
  winner: z.object({ id: id.nullish() }).nullish(),
  forfeit: z.boolean().nullish(),
  begin_at: iso,
  end_at: iso,
  length: z.number().nullish(),
});

const streamSchema = z.object({
  raw_url: str,
  language: str,
  official: z.boolean().nullish(),
  main: z.boolean().nullish(),
});

export const matchSchema = z.object({
  id,
  slug: str,
  name: z.string().nullish(),
  status: z.string().nullish(),
  scheduled_at: iso,
  begin_at: iso,
  end_at: iso,
  original_scheduled_at: iso,
  rescheduled: z.boolean().nullish(),
  match_type: str,
  number_of_games: z.number().nullish(),
  draw: z.boolean().nullish(),
  forfeit: z.boolean().nullish(),
  winner_id: id.nullish(),
  modified_at: iso,
  videogame: z.object({ slug: str }).nullish(),
  league: leagueSchema.nullish(),
  serie: serieSchema.nullish(),
  tournament: tournamentRefSchema.nullish(),
  opponents: z
    .array(z.object({ type: str, opponent: teamSchema.nullish() }))
    .nullish(),
  results: z
    .array(z.object({ team_id: id.nullish(), score: z.number().nullish() }))
    .nullish(),
  games: z.array(gameSchema).nullish(),
  streams_list: z.array(streamSchema).nullish(),
});

export const tournamentSchema = tournamentRefSchema.extend({
  slug: str,
  winner_id: id.nullish(),
  has_bracket: z.boolean().nullish(),
  modified_at: iso,
  videogame: z.object({ slug: str }).nullish(),
  league: leagueSchema.nullish(),
  serie: serieSchema.nullish(),
  matches: z.array(z.unknown()).nullish(),
  teams: z.array(teamSchema).nullish(),
});

type RawMatch = z.infer<typeof matchSchema>;
type RawTeam = z.infer<typeof teamSchema>;
type RawTournament = z.infer<typeof tournamentSchema>;

// ---------------------------------------------------------------------------
// Normalizadores
// ---------------------------------------------------------------------------

/** Converte o status da PandaScore. Nunca infere resultado pelo horário. */
export function mapStatus(raw: string | null | undefined): MatchStatus {
  switch (raw) {
    case "not_started":
      return "scheduled";
    case "running":
      return "live";
    case "finished":
      return "finished";
    case "postponed":
      return "postponed";
    case "canceled":
    case "cancelled":
      return "canceled";
    default:
      return "unknown";
  }
}

export function mapFormat(type: string | null | undefined, games: number | null | undefined): MatchFormat {
  const n = typeof games === "number" && games > 0 ? games : null;
  if (type === "best_of") return { type, games: n, label: n ? `BO${n}` : null };
  if (type === "first_to") return { type, games: n, label: n ? `FT${n}` : null };
  if (type === "custom" || type === "red_bull_home_ground" || type === "ow_best_of")
    return { type: "custom", games: n, label: null };
  return { type: "unknown", games: n, label: null };
}

/** Garante ISO-8601 UTC ("...Z") ou null se a data for inválida. */
export function toUtcIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export function normalizeTeam(t: RawTeam): Team {
  return {
    id: t.id,
    name: t.name,
    acronym: t.acronym ?? null,
    slug: t.slug ?? null,
    location: t.location ?? null,
    logo: t.dark_mode_image_url || t.image_url || null,
  };
}

function normalizeLeague(l: RawMatch["league"]): LeagueRef | null {
  return l ? { id: l.id, name: l.name, logo: l.image_url ?? null } : null;
}

function normalizeSerie(s: RawMatch["serie"]): SerieRef | null {
  if (!s) return null;
  const name = s.full_name || s.name || s.season || null;
  return { id: s.id, name: name?.trim() || null, year: s.year ?? null };
}

function normalizeTournamentRef(t: RawMatch["tournament"]): TournamentRef | null {
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    tier: t.tier ?? null,
    region: t.region ?? null,
    type: t.type ?? null,
    prizepool: t.prizepool ?? null,
    beginAt: toUtcIso(t.begin_at),
    endAt: toUtcIso(t.end_at),
  };
}

/** "Quarterfinal 1: BST.A vs RED.A" → "Quarterfinal 1". */
export function extractRound(name: string | null | undefined): string | null {
  if (!name) return null;
  const i = name.indexOf(":");
  if (i <= 0) return null;
  const round = name.slice(0, i).trim();
  return round || null;
}

export function normalizeMatch(m: RawMatch): Match {
  const status = mapStatus(m.status);
  const opps = (m.opponents ?? []).map((o) => (o.opponent ? normalizeTeam(o.opponent) : null));
  const scoreOf = (team: Team | null) => {
    if (!team) return null;
    const r = (m.results ?? []).find((x) => x.team_id === team.id);
    return typeof r?.score === "number" ? r.score : null;
  };
  const side = (team: Team | null): Side => ({ team, score: scoreOf(team) });

  const games: MatchGame[] = (m.games ?? [])
    .map((g) => ({
      id: g.id,
      position: g.position ?? 0,
      status: mapStatus(g.status),
      winnerId: g.winner?.id ?? null,
      forfeit: Boolean(g.forfeit),
      beginAt: toUtcIso(g.begin_at),
      endAt: toUtcIso(g.end_at),
      length: typeof g.length === "number" ? g.length : null,
    }))
    .sort((a, b) => a.position - b.position);

  const streams: Stream[] = (m.streams_list ?? [])
    .filter((s) => typeof s.raw_url === "string" && /^https:\/\//.test(s.raw_url))
    .map((s) => ({
      url: s.raw_url as string,
      language: s.language ?? null,
      official: Boolean(s.official),
      main: Boolean(s.main),
    }));

  return {
    id: m.id,
    slug: m.slug ?? null,
    name: m.name ?? "",
    round: extractRound(m.name),
    status,
    rawStatus: m.status ?? "unknown",
    scheduledAt: toUtcIso(m.scheduled_at),
    beginAt: toUtcIso(m.begin_at),
    endAt: toUtcIso(m.end_at),
    originalScheduledAt: toUtcIso(m.original_scheduled_at),
    rescheduled: Boolean(m.rescheduled),
    format: mapFormat(m.match_type, m.number_of_games),
    sides: [side(opps[0] ?? null), side(opps[1] ?? null)],
    // Vencedor só é considerado quando a partida está finalizada.
    winnerId: status === "finished" ? (m.winner_id ?? null) : null,
    draw: Boolean(m.draw),
    forfeit: Boolean(m.forfeit),
    league: normalizeLeague(m.league),
    serie: normalizeSerie(m.serie),
    tournament: normalizeTournamentRef(m.tournament),
    games,
    streams,
    modifiedAt: toUtcIso(m.modified_at),
  };
}

export function normalizeTournament(t: RawTournament): Tournament {
  return {
    ...(normalizeTournamentRef(t) as TournamentRef),
    slug: t.slug ?? null,
    league: normalizeLeague(t.league),
    serie: normalizeSerie(t.serie),
    winnerId: t.winner_id ?? null,
    hasBracket: Boolean(t.has_bracket),
    matchCount: Array.isArray(t.matches) ? t.matches.length : null,
    teams: (t.teams ?? []).map(normalizeTeam),
    modifiedAt: toUtcIso(t.modified_at),
  };
}

// ---------------------------------------------------------------------------
// Parse de listas: itens inválidos são descartados (e contados), sem derrubar
// a página inteira por causa de um registro malformado.
// ---------------------------------------------------------------------------

export type ParseResult<T> = { items: T[]; invalid: number };

export function parseMatches(data: unknown): ParseResult<Match> {
  return parseList(data, matchSchema, normalizeMatch);
}

export function parseTournaments(data: unknown): ParseResult<Tournament> {
  return parseList(data, tournamentSchema, normalizeTournament);
}

export function parseMatch(data: unknown): Match | null {
  const r = matchSchema.safeParse(data);
  return r.success ? normalizeMatch(r.data) : null;
}

export function parseTournament(data: unknown): Tournament | null {
  const r = tournamentSchema.safeParse(data);
  return r.success ? normalizeTournament(r.data) : null;
}

function parseList<S extends z.ZodType, T>(
  data: unknown,
  schema: S,
  normalize: (raw: z.infer<S>) => T,
): ParseResult<T> {
  if (!Array.isArray(data)) return { items: [], invalid: 1 };
  const items: T[] = [];
  let invalid = 0;
  for (const raw of data) {
    const r = schema.safeParse(raw);
    if (r.success) items.push(normalize(r.data));
    else invalid++;
  }
  return { items, invalid };
}

/** Slug do videogame (para garantir que /matches/:id é mesmo de CS). */
export function videogameSlug(data: unknown): string | null {
  if (data && typeof data === "object" && "videogame" in data) {
    const v = (data as { videogame?: { slug?: unknown } }).videogame;
    return typeof v?.slug === "string" ? v.slug : null;
  }
  return null;
}
