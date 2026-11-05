// Jogo integrado ao Cloud E-Sports. Apenas CS2.

export type EsportsGame = {
  key: string;
  label: string;
  /** Prefixo do videogame na PandaScore (ex.: "/csgo/..."). */
  pandascorePrefix: string;
  /** Slug do videogame retornado pela PandaScore nos objetos. */
  pandascoreSlug: string;
};

export const CS2: EsportsGame = {
  key: "cs2",
  label: "CS2",
  pandascorePrefix: "csgo",
  pandascoreSlug: "cs-go",
};
