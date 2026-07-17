import type { Exterior } from "@/types/database";

// Sigla ↔ nome completo do desgaste (usado nos filtros e nos cards).
export const EXT_ABBR: Record<Exterior, string> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
};

export const ABBR_TO_EXT: Record<string, Exterior> = {
  FN: "Factory New",
  MW: "Minimal Wear",
  FT: "Field-Tested",
  WW: "Well-Worn",
  BS: "Battle-Scarred",
};

export const WEAR_ABBRS = ["FN", "MW", "FT", "WW", "BS"] as const;
