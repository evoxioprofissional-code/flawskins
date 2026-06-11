// Tipos e metadados da Flaw Arena.

export const ARENA_GAME_SLUGS = [
  "gridshot",
  "microflick",
  "tracking",
  "peek",
  "headshot",
  "reflexo",
] as const;
export type ArenaGame = (typeof ARENA_GAME_SLUGS)[number];

export const ARENA_PERIODS = ["dia", "semana", "mes", "geral"] as const;
export type ArenaPeriod = (typeof ARENA_PERIODS)[number];

export const PERIOD_LABEL: Record<ArenaPeriod, string> = {
  dia: "Diário",
  semana: "Semanal",
  mes: "Mensal",
  geral: "Geral",
};

export type ArenaGameMeta = {
  slug: ArenaGame;
  nome: string;
  curto: string;
  desc: string;
  unidade: "ms" | "pts";
  melhor: "menor" | "maior";
  tipo: "aim" | "reflex";
  accent: string;
};

export const ARENA_GAMES: Record<ArenaGame, ArenaGameMeta> = {
  gridshot: {
    slug: "gridshot",
    nome: "Gridshot Pro",
    curto: "Gridshot",
    desc: "Alvos pequenos, spawn instantâneo e velocidade crescente. Combo, accuracy e headshots.",
    unidade: "pts",
    melhor: "maior",
    tipo: "aim",
    accent: "#f97316",
  },
  microflick: {
    slug: "microflick",
    nome: "Micro Flick",
    curto: "Micro Flick",
    desc: "Alvos minúsculos aparecem e somem rápido. Flick e reação no limite.",
    unidade: "pts",
    melhor: "maior",
    tipo: "aim",
    accent: "#22d3ee",
  },
  tracking: {
    slug: "tracking",
    nome: "Tracking Trainer",
    curto: "Tracking",
    desc: "Mantenha a mira em cima do alvo em movimento. Pontua pelo tempo rastreando.",
    unidade: "pts",
    melhor: "maior",
    tipo: "aim",
    accent: "#a855f7",
  },
  peek: {
    slug: "peek",
    nome: "Peek Trainer",
    curto: "Peek",
    desc: "Inimigos dão peek atrás de coberturas. Reaja e puna o mais rápido possível.",
    unidade: "pts",
    melhor: "maior",
    tipo: "aim",
    accent: "#34d399",
  },
  headshot: {
    slug: "headshot",
    nome: "Headshot Challenge",
    curto: "Headshot",
    desc: "Só headshot conta. Corpo não pontua. Precisão pura.",
    unidade: "pts",
    melhor: "maior",
    tipo: "aim",
    accent: "#ef4444",
  },
  reflexo: {
    slug: "reflexo",
    nome: "Reação Avançada",
    curto: "Reação",
    desc: "Teste de reflexo com histórico, evolução e média. Menor tempo vence.",
    unidade: "ms",
    melhor: "menor",
    tipo: "reflex",
    accent: "#eab308",
  },
};

export function isArenaGame(v: string): v is ArenaGame {
  return (ARENA_GAME_SLUGS as readonly string[]).includes(v);
}

export function formatScore(game: ArenaGame, valor: number | null): string {
  if (valor == null) return "—";
  return ARENA_GAMES[game].unidade === "ms"
    ? `${valor} ms`
    : `${valor.toLocaleString("pt-BR")} pts`;
}

// ---- Dificuldade ----
export const DIFFICULTIES = ["facil", "medio", "dificil", "insano"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFF_LABEL: Record<Difficulty, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
  insano: "Insano",
};

// Multiplicadores aplicados sobre os parâmetros-base de cada modo.
export const DIFF_PARAMS: Record<
  Difficulty,
  { size: number; speed: number; life: number; spawn: number }
> = {
  facil: { size: 1.45, speed: 0.7, life: 1.7, spawn: 1.4 },
  medio: { size: 1.0, speed: 1.0, life: 1.0, spawn: 1.0 },
  dificil: { size: 0.72, speed: 1.45, life: 0.7, spawn: 0.7 },
  insano: { size: 0.5, speed: 2.0, life: 0.5, spawn: 0.5 },
};

// ---- Resultado de uma partida ----
export type MatchMetrics = {
  valor: number;
  accuracy: number | null;
  hits: number;
  misses: number;
  combo: number;
  reacao_media: number | null;
  dificuldade: Difficulty;
};

// ---- Stats agregadas (RPC arena_user_stats) ----
export type ArenaStats = {
  jogos: Partial<Record<ArenaGame, { best: number | null; pos: number | null }>>;
  partidas: number;
  temporadas_disputadas: number;
  temporadas_vencidas: number;
  streak: number;
  best_combo: number;
  best_reaction: number | null;
  media_accuracy: number | null;
  rating: number;
  tier: ArenaTier;
  conquistas: string[];
};

export type RankingRow = {
  user_id: string;
  nome: string | null;
  avatar_url: string | null;
  best: number;
  jogadas: number;
  posicao: number;
};

// ---- Ranks (tiers) ----
export const ARENA_TIERS = [
  "Bronze",
  "Prata",
  "Ouro",
  "AK",
  "Águia",
  "Global",
] as const;
export type ArenaTier = (typeof ARENA_TIERS)[number];

export const TIER_META: Record<
  ArenaTier,
  { emoji: string; cor: string; anel: string }
> = {
  Bronze: { emoji: "🥉", cor: "text-amber-600", anel: "ring-amber-600/40" },
  Prata: { emoji: "⚪", cor: "text-zinc-300", anel: "ring-zinc-300/40" },
  Ouro: { emoji: "🥇", cor: "text-yellow-400", anel: "ring-yellow-400/40" },
  AK: { emoji: "🔫", cor: "text-orange-400", anel: "ring-orange-400/40" },
  Águia: { emoji: "🦅", cor: "text-sky-400", anel: "ring-sky-400/40" },
  Global: { emoji: "🌍", cor: "text-fuchsia-400", anel: "ring-fuchsia-400/40" },
};

// ---- Conquistas ----
const TOP_LABEL: Record<ArenaGame, string> = {
  gridshot: "Gridshot",
  microflick: "Micro Flick",
  tracking: "Tracking",
  peek: "Peek",
  headshot: "Headshot",
  reflexo: "Reflexo",
};

function buildAchievements() {
  const map: Record<string, { emoji: string; label: string }> = {
    streak7: { emoji: "🔥", label: "7 dias seguidos" },
    streak30: { emoji: "🔥", label: "30 dias consecutivos" },
    ads100: { emoji: "💰", label: "100 anúncios publicados" },
    season_champion: { emoji: "⭐", label: "Campeão de Temporada" },
  };
  for (const g of ARENA_GAME_SLUGS) {
    map[`top100_${g}`] = { emoji: "🥉", label: `Top 100 ${TOP_LABEL[g]}` };
    map[`top10_${g}`] = { emoji: "🥈", label: `Top 10 ${TOP_LABEL[g]}` };
    map[`top1_${g}`] = { emoji: "🥇", label: `Top 1 ${TOP_LABEL[g]}` };
  }
  return map;
}

export const ACHIEVEMENT_META = buildAchievements();

export function achievementLabel(code: string) {
  return ACHIEVEMENT_META[code] ?? { emoji: "🏅", label: code };
}
