// Renders transparentes de skins icônicas para decorar o hero.
// Fonte: CS2-API do ByMykel (grátis, imagens são os PNGs oficiais da Steam).
// Cache de 1 dia — não precisa bater na API a cada request.

const API =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

// Skins vistosas pra flutuar (busca por trecho do nome, pega a 1ª que casar).
const WANTED = [
  "Dragon Lore",
  "Karambit | Doppler",
  "Desert Eagle | Printstream",
  "Butterfly Knife | Fade",
  "M4A4 | Howl",
  "AK-47 | Fire Serpent",
];

type ApiSkin = { name?: string; image?: string };

export async function getShowcaseSkins(limit = 5): Promise<string[]> {
  try {
    const res = await fetch(API, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const all = (await res.json()) as ApiSkin[];

    const out: string[] = [];
    for (const alvo of WANTED) {
      const hit = all.find(
        (s) => s.image && s.name?.toLowerCase().includes(alvo.toLowerCase())
      );
      if (hit?.image) out.push(hit.image);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
