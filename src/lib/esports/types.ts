// Tipos de domínio do módulo Cloud E-Sports (independentes do provedor).
// Tudo que vem da PandaScore é normalizado para estes formatos em
// `normalize.ts` antes de chegar às páginas.

export type MatchStatus =
  | "scheduled" // agendada (not_started)
  | "live" // ao vivo (running)
  | "finished" // finalizada
  | "postponed" // adiada
  | "canceled" // cancelada
  | "unknown"; // qualquer status não mapeado

export type Team = {
  id: number;
  name: string;
  acronym: string | null;
  slug: string | null;
  location: string | null;
  /** Logo preferencial para tema escuro (dark_mode_image_url ?? image_url). */
  logo: string | null;
};

/** Um lado do confronto. `team` nulo = adversário ainda não definido (TBD). */
export type Side = {
  team: Team | null;
  score: number | null;
};

export type MatchFormat = {
  type: "best_of" | "first_to" | "custom" | "unknown";
  games: number | null;
  /** "BO1", "BO3", "BO5", "FT2"… ou null quando não informado. */
  label: string | null;
};

export type MatchGame = {
  id: number;
  position: number;
  status: MatchStatus;
  winnerId: number | null;
  forfeit: boolean;
  beginAt: string | null;
  endAt: string | null;
  /** Duração em segundos, quando informada. */
  length: number | null;
};

export type Stream = {
  url: string;
  language: string | null;
  official: boolean;
  main: boolean;
};

export type LeagueRef = { id: number; name: string; logo: string | null };
export type SerieRef = { id: number; name: string | null; year: number | null };
export type TournamentRef = {
  id: number;
  name: string;
  tier: string | null;
  region: string | null;
  type: string | null;
  prizepool: string | null;
  beginAt: string | null;
  endAt: string | null;
};

export type Match = {
  id: number;
  slug: string | null;
  name: string;
  /** Rodada/etapa extraída do nome ("Quarterfinal 1", "Grand final"…). */
  round: string | null;
  status: MatchStatus;
  /** Status bruto da API, mantido para auditoria/sync. */
  rawStatus: string;
  /** Instantes em ISO-8601 UTC. */
  scheduledAt: string | null;
  beginAt: string | null;
  endAt: string | null;
  originalScheduledAt: string | null;
  rescheduled: boolean;
  format: MatchFormat;
  sides: [Side, Side];
  winnerId: number | null;
  draw: boolean;
  forfeit: boolean;
  league: LeagueRef | null;
  serie: SerieRef | null;
  tournament: TournamentRef | null;
  games: MatchGame[];
  streams: Stream[];
  modifiedAt: string | null;
};

export type Tournament = TournamentRef & {
  slug: string | null;
  league: LeagueRef | null;
  serie: SerieRef | null;
  winnerId: number | null;
  hasBracket: boolean;
  /** Quantidade de partidas informada pela API (null se não veio). */
  matchCount: number | null;
  teams: Team[];
  modifiedAt: string | null;
};

export type TournamentPhase = "running" | "upcoming" | "past";

export type Paginated<T> = {
  items: T[];
  page: number;
  perPage: number;
  /** Total informado pelo header X-Total (null se ausente). */
  total: number | null;
};
