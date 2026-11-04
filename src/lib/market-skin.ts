import type { Categoria } from "@/types/database";
import { SKIN_RARITY } from "@/lib/skin-rarity";

export function marketRarity(title: string, category: Categoria) {
  if (category === "Faca" || category === "Luva") return "#eb4b4b";

  const name = title.trim()
    .replace(/^(?:(?:★|StatTrak™?|Souvenir)\s*)+/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*\|\s*/g, " | ")
    .toLowerCase();

  return Object.hasOwn(SKIN_RARITY, name) ? SKIN_RARITY[name] : undefined;
}

export function marketSkinTitle(title: string) {
  const separator = title.indexOf("|");
  if (separator < 0) return { weapon: "", finish: title.trim() };
  return {
    weapon: title.slice(0, separator).trim(),
    finish: title.slice(separator + 1)
      .replace(/\s*\((?:Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i, "")
      .trim(),
  };
}
