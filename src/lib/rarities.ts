// Raridades do Market (cor oficial → nome). Módulo leve, seguro para o client
// (o mapa completo de skins fica em skin-rarity.ts e só roda no servidor).
export const MARKET_RARITIES = [
  ["#b0c3d9", "Consumer Grade"],
  ["#5e98d9", "Industrial Grade"],
  ["#4b69ff", "Mil-Spec"],
  ["#8847ff", "Restricted"],
  ["#d32ce6", "Classified"],
  ["#eb4b4b", "Covert / Especial"],
  ["#e4ae39", "Contraband"],
] as const;

export function rarityName(color: string | undefined): string | null {
  return MARKET_RARITIES.find(([c]) => c === color)?.[1] ?? null;
}
