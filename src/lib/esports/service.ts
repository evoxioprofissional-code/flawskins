import "server-only";

import { cookies } from "next/headers";

import { CS2 } from "./games";
import { dayRangeUtc, safeTimeZone } from "./datetime";
import { parseMatch, parseMatches, parseTournament, parseTournaments, videogameSlug } from "./normalize";
import { PandaScoreError, pageQuery, pandascoreRequest } from "./pandascore";
import type { Match, Paginated, Tournament, TournamentPhase } from "./types";

// Casos de uso do módulo E-Sports (camada usada pelas páginas e pelo sync).
// Toda chamada à PandaScore passa por aqui — nunca pelo client.

const PREFIX = `/${CS2.pandascorePrefix}`;

// Tempo de cache (segundos) por tipo de dado.
const TTL = {
  live: 30,
  upcoming: 60,
  day: 60,
  past: 300,
  match: 30,
  tournaments: 600,
  tournament: 120,
} as const;

export const MATCH_FILTERS = ["all", "live", "today", "tomorrow", "upcoming", "finished"] as const;
export type MatchFilter = (typeof MATCH_FILTERS)[number];
export type SortDir = "asc" | "desc";

export const RESULT_PERIODS = ["7d", "30d", "90d", "all"] as const;
export type ResultPeriod = (typeof RESULT_PERIODS)[number];

/** Cookie opcional com o fuso preferido do usuário (IANA). */
export const TZ_COOKIE = "cloud_tz";

export async function getViewerTimeZone(): Promise<string> {
  try {
    return safeTimeZone((await cookies()).get(TZ_COOKIE)?.value);
  } catch {
    return safeTimeZone(null);
  }
}

function logInvalid(path: string, invalid: number) {
  if (invalid > 0) console.warn(`[esports] ${invalid} registro(s) inválido(s) descartado(s) em ${path}`);
}

async function fetchMatchPage(
  path: string,
  query: Record<string, string | number | undefined>,
  revalidate: number,
  tags: string[],
): Promise<Paginated<Match>> {
  const res = await pandascoreRequest({ path, query, revalidate, tags });
  const { items, invalid } = parseMatches(res.data);
  logInvalid(path, invalid);
  return {
    items,
    page: res.page ?? Number(query.page ?? 1),
    perPage: res.perPage ?? Number(query.per_page ?? items.length),
    total: res.total,
  };
}

export async function listMatches(opts: {
  filter: MatchFilter;
  page?: number;
  perPage?: number;
  sort?: SortDir;
  tz?: string;
  now?: Date;
}): Promise<Paginated<Match>> {
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 20;
  const tz = safeTimeZone(opts.tz);
  const now = opts.now ?? new Date();
  const pq = pageQuery(page, perPage);

  // Data de referência: scheduled_at (horário oficial do confronto).
  const asc = "scheduled_at";
  const desc = "-scheduled_at";

  switch (opts.filter) {
    case "live":
      return fetchMatchPage(`${PREFIX}/matches/running`, { ...pq, sort: opts.sort === "desc" ? "-begin_at" : "begin_at" }, TTL.live, ["esports:live"]);

    case "upcoming":
      return fetchMatchPage(`${PREFIX}/matches/upcoming`, { ...pq, sort: opts.sort === "desc" ? desc : asc }, TTL.upcoming, ["esports:upcoming"]);

    case "finished":
      // Padrão: mais recentes primeiro.
      return fetchMatchPage(`${PREFIX}/matches/past`, { ...pq, sort: opts.sort === "asc" ? asc : desc, "filter[status]": "finished" }, TTL.past, ["esports:past"]);

    case "today":
    case "tomorrow": {
      const { start, end } = dayRangeUtc(now, tz, opts.filter === "today" ? 0 : 1);
      return fetchMatchPage(
        `${PREFIX}/matches`,
        {
          ...pq,
          sort: opts.sort === "desc" ? desc : asc,
          "range[scheduled_at]": `${start.toISOString()},${end.toISOString()}`,
        },
        TTL.day,
        ["esports:day"],
      );
    }

    case "all":
    default: {
      // "Todas" = ao vivo (sempre no topo da 1ª página) + próximas paginadas.
      const [live, upcoming] = await Promise.all([
        page === 1
          ? listMatches({ filter: "live", perPage: 50, tz, now })
          : Promise.resolve<Paginated<Match>>({ items: [], page: 1, perPage: 50, total: null }),
        listMatches({ filter: "upcoming", page, perPage, sort: opts.sort, tz, now }),
      ]);
      return {
        items: [...live.items, ...upcoming.items],
        page,
        perPage,
        total: upcoming.total,
      };
    }
  }
}

/** Totais reais (header X-Total) para o cabeçalho de Partidas. null = indisponível. */
export async function getMatchCounts(opts: { tz?: string; now?: Date } = {}) {
  const [live, today, upcoming] = await Promise.allSettled([
    listMatches({ filter: "live", perPage: 50, ...opts }),
    listMatches({ filter: "today", perPage: 1, ...opts }),
    listMatches({ filter: "upcoming", perPage: 1, ...opts }),
  ]);
  const total = (r: PromiseSettledResult<Paginated<Match>>, useLength = false) =>
    r.status === "fulfilled" ? (useLength ? (r.value.total ?? r.value.items.length) : r.value.total) : null;
  return { live: total(live, true), today: total(today), upcoming: total(upcoming) };
}

/** Partida por id. Usa /matches/:id (o /csgo/matches/:id é restrito no plano gratuito). */
export async function getMatch(id: number): Promise<Match | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  try {
    const res = await pandascoreRequest({ path: `/matches/${id}`, revalidate: TTL.match, tags: [`esports:match:${id}`] });
    if (videogameSlug(res.data) !== CS2.pandascoreSlug) return null;
    return parseMatch(res.data);
  } catch (e) {
    if (e instanceof PandaScoreError && e.kind === "not_found") return null;
    throw e;
  }
}

export async function listResults(opts: {
  page?: number;
  perPage?: number;
  period?: ResultPeriod;
  tournamentId?: number;
  now?: Date;
}): Promise<Paginated<Match>> {
  const pq = pageQuery(opts.page ?? 1, opts.perPage ?? 20);
  const query: Record<string, string | number | undefined> = {
    ...pq,
    sort: "-begin_at",
    "filter[status]": "finished",
  };
  const days = { "7d": 7, "30d": 30, "90d": 90, all: null }[opts.period ?? "all"];
  if (days) {
    // Janela arredondada em blocos de 5 min: a URL (chave do cache) fica
    // estável. Com o "agora" exato em ms, todo request era um cache miss.
    const BLOCK = 5 * 60_000;
    const edge = Math.ceil((opts.now ?? new Date()).getTime() / BLOCK) * BLOCK;
    const from = new Date(edge - days * 86_400_000);
    query["range[begin_at]"] = `${from.toISOString()},${new Date(edge).toISOString()}`;
  }
  if (opts.tournamentId) query["filter[tournament_id]"] = opts.tournamentId;
  return fetchMatchPage(`${PREFIX}/matches/past`, query, TTL.past, ["esports:past"]);
}

export async function listTournaments(opts: {
  phase: TournamentPhase;
  page?: number;
  perPage?: number;
}): Promise<Paginated<Tournament>> {
  const pq = pageQuery(opts.page ?? 1, opts.perPage ?? 20);
  const sort = opts.phase === "past" ? "-end_at" : "begin_at";
  const path = `${PREFIX}/tournaments/${opts.phase}`;
  const res = await pandascoreRequest({ path, query: { ...pq, sort }, revalidate: TTL.tournaments, tags: ["esports:tournaments"] });
  const { items, invalid } = parseTournaments(res.data);
  logInvalid(path, invalid);
  return { items, page: res.page ?? pq.page as number, perPage: res.perPage ?? (pq.per_page as number), total: res.total };
}

export async function getTournament(id: number): Promise<{ tournament: Tournament; matches: Match[] } | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  try {
    const res = await pandascoreRequest({ path: `/tournaments/${id}`, revalidate: TTL.tournament, tags: [`esports:tournament:${id}`] });
    if (videogameSlug(res.data) !== CS2.pandascoreSlug) return null;
    const tournament = parseTournament(res.data);
    if (!tournament) return null;

    const m = await pandascoreRequest({
      path: `/tournaments/${id}/matches`,
      query: { per_page: 100, sort: "scheduled_at" },
      revalidate: TTL.tournament,
      tags: [`esports:tournament:${id}`],
    });
    const { items, invalid } = parseMatches(m.data);
    logInvalid(`/tournaments/${id}/matches`, invalid);
    return { tournament, matches: items };
  } catch (e) {
    if (e instanceof PandaScoreError && e.kind === "not_found") return null;
    throw e;
  }
}

/** Opções de campeonato para o filtro de Resultados (em andamento + recentes). */
export async function listTournamentOptions(): Promise<Tournament[]> {
  const [running, past] = await Promise.allSettled([
    listTournaments({ phase: "running", perPage: 50 }),
    listTournaments({ phase: "past", perPage: 30 }),
  ]);
  const all = [
    ...(running.status === "fulfilled" ? running.value.items : []),
    ...(past.status === "fulfilled" ? past.value.items : []),
  ];
  const seen = new Set<number>();
  return all.filter((t) => !seen.has(t.id) && seen.add(t.id));
}

/** Nome completo legível: "Liga · Temporada · Etapa". */
export function tournamentTitle(t: { league: { name: string } | null; serie: { name: string | null } | null; name: string }): string {
  return [t.league?.name, t.serie?.name, t.name].filter(Boolean).join(" · ");
}
