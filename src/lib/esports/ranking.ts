import "server-only";

// Ranking de equipes — arquitetura pronta para um provedor oficial.
//
// A PandaScore não publica um ranking global de equipes de CS2 (só a
// classificação interna de cada campeonato), e uma lista arbitrária de times
// NÃO é ranking. Por isso nenhum provedor está registrado: a página mostra um
// estado vazio até existir uma fonte real e autorizada (ex.: ranking oficial
// licenciado). Para ativar, implemente `RankingProvider` e registre-o abaixo.

export type RankingEntry = {
  position: number;
  points: number | null;
  team: { name: string; logo: string | null; acronym: string | null };
  /** Variação de posição desde a última atualização, se o provedor informar. */
  change: number | null;
};

export type Ranking = {
  source: string;
  sourceUrl: string | null;
  updatedAt: string; // ISO UTC
  entries: RankingEntry[];
};

export interface RankingProvider {
  readonly name: string;
  fetchRanking(game: string): Promise<Ranking | null>;
}

const providers: RankingProvider[] = [];

export async function getTeamRanking(game: string): Promise<Ranking | null> {
  for (const p of providers) {
    try {
      const r = await p.fetchRanking(game);
      if (r && r.entries.length) return r;
    } catch {
      console.warn(`[esports] provedor de ranking "${p.name}" falhou`);
    }
  }
  return null;
}
