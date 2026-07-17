// Gera src/lib/cs2-weapons.ts e src/lib/skins-showcase.ts a partir da CS2-API
// do ByMykel. Roda UMA vez (dev), pra não baixar ~7MB em runtime.
const https = require("https");
const fs = require("fs");

function get(u, n = 0) {
  return new Promise((res, rej) => {
    https
      .get(u, { headers: { "User-Agent": "node" } }, (r) => {
        if ([301, 302, 307, 308].includes(r.statusCode) && r.headers.location && n < 5) {
          return res(get(r.headers.location, n + 1));
        }
        let d = "";
        r.on("data", (c) => (d += c));
        r.on("end", () => res(d));
      })
      .on("error", rej);
  });
}

// Mesmas listas do TopCategoryNav.
const CATS = {
  Facas: ["Bayonet","Bowie Knife","Butterfly Knife","Classic Knife","Falchion Knife","Flip Knife","Gut Knife","Huntsman Knife","Karambit","Kukri Knife","M9 Bayonet","Navaja Knife","Nomad Knife","Paracord Knife","Shadow Daggers","Skeleton Knife","Stiletto Knife","Survival Knife","Talon Knife","Ursus Knife"],
  Luvas: ["Bloodhound Gloves","Broken Fang Gloves","Driver Gloves","Hand Wraps","Hydra Gloves","Moto Gloves","Specialist Gloves","Sport Gloves"],
  Rifles: ["AK-47","AUG","FAMAS","Galil AR","M4A1-S","M4A4","SG 553"],
  Pistolas: ["CZ75-Auto","Desert Eagle","Dual Berettas","Five-SeveN","Glock-18","P2000","P250","R8 Revolver","Tec-9","USP-S"],
  SMG: ["MAC-10","MP5-SD","MP7","MP9","P90","PP-Bizon","UMP-45"],
  Snipers: ["AWP","SSG 08","G3SG1","SCAR-20"],
  Outros: ["MAG-7","Nova","Sawed-Off","XM1014","M249","Negev","Zeus x27"],
};

const SHOWCASE_WANTED = [
  "Dragon Lore",
  "Karambit | Doppler",
  "Desert Eagle | Printstream",
  "Butterfly Knife | Fade",
  "M4A4 | Howl",
  "AK-47 | Fire Serpent",
];

const norm = (s) => (s || "").replace(/^★\s*/, "").trim().toLowerCase();

(async () => {
  const body = await get(
    "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json"
  );
  const all = JSON.parse(body);
  console.log("catálogo:", all.length, "skins");

  // ---- Miniaturas por arma ----
  const alvos = Object.values(CATS).flat();
  const mapa = {};
  const faltando = [];
  for (const w of alvos) {
    // Prefere um skin colorido (não vanilla) daquela arma.
    const hit =
      all.find((s) => s.image && norm(s.weapon?.name) === norm(w)) ||
      all.find((s) => s.image && norm(s.name).startsWith(norm(w) + " |"));
    if (hit) mapa[w] = hit.image;
    else faltando.push(w);
  }
  console.log("armas com imagem:", Object.keys(mapa).length, "| sem:", faltando.join(", ") || "-");

  const arquivoArmas =
    `// Miniaturas das armas de CS2 (render oficial da Steam).\n` +
    `// GERADO uma vez a partir da CS2-API do ByMykel — não baixamos o\n` +
    `// catálogo (~7MB) em runtime. Para atualizar, rode scripts/gen-cs2.\n` +
    `export const WEAPON_IMG: Record<string, string> = {\n` +
    Object.entries(mapa)
      .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
      .join("\n") +
    `\n};\n`;
  fs.writeFileSync("src/lib/cs2-weapons.ts", arquivoArmas);

  // ---- Showcase do hero ----
  const urls = [];
  for (const w of SHOWCASE_WANTED) {
    const hit = all.find((s) => s.image && norm(s.name).includes(norm(w)));
    if (hit) urls.push(hit.image);
  }
  console.log("showcase:", urls.length, "urls");

  const arquivoShowcase =
    `// Renders de skins icônicas usados no hero.\n` +
    `// GERADO uma vez a partir da CS2-API do ByMykel — antes isso baixava\n` +
    `// ~7MB a cada request e deixava a home lenta (13s).\n` +
    `const SHOWCASE = [\n` +
    urls.map((u) => `  ${JSON.stringify(u)},`).join("\n") +
    `\n];\n\n` +
    `// Skins pra compor o hero (PNG transparente da Steam).\n` +
    `export function getShowcaseSkins(limit = 5): string[] {\n` +
    `  return SHOWCASE.slice(0, limit);\n` +
    `}\n`;
  fs.writeFileSync("src/lib/skins-showcase.ts", arquivoShowcase);

  console.log("OK — arquivos escritos");
})();
