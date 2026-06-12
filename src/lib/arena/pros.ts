import { presetById, type CrosshairConfig } from "@/lib/arena/crosshairs";

// Configurações de referência de pros de CS2 (valores aproximados,
// para fins de treino/comparação na Arena).
export type ProPlayer = {
  id: string;
  nome: string;
  time: string;
  cor: string; // acento do time
  dpi: number;
  sens: number;
  res: string;
  aspect: string;
  crosshair: CrosshairConfig;
  ref: { reflexo: number; gridshot: number }; // referências para "Compare os Pros"
};

export function edpi(p: ProPlayer): number {
  return Math.round(p.dpi * p.sens);
}

export const PRO_PLAYERS: ProPlayer[] = [
  {
    id: "donk",
    nome: "donk",
    time: "Team Spirit",
    cor: "#f43f5e",
    dpi: 400,
    sens: 1.4,
    res: "1280×960",
    aspect: "4:3",
    crosshair: { color: "#00ff00", size: 3, thickness: 1, gap: 2, dot: false, outline: true, alpha: 1 },
    ref: { reflexo: 193, gridshot: 94 },
  },
  {
    id: "zywoo",
    nome: "ZywOo",
    time: "Vitality",
    cor: "#fde047",
    dpi: 400,
    sens: 2.0,
    res: "1280×960",
    aspect: "4:3",
    crosshair: { color: "#00ffff", size: 0, thickness: 4, gap: 0, dot: true, outline: true, alpha: 1 },
    ref: { reflexo: 201, gridshot: 89 },
  },
  {
    id: "m0nesy",
    nome: "m0NESY",
    time: "G2 Esports",
    cor: "#ef4444",
    dpi: 400,
    sens: 2.0,
    res: "1280×960",
    aspect: "4:3",
    crosshair: { color: "#00ff88", size: 5, thickness: 1, gap: 1, dot: false, outline: true, alpha: 1 },
    ref: { reflexo: 198, gridshot: 91 },
  },
  {
    id: "s1mple",
    nome: "s1mple",
    time: "FaZe (loan)",
    cor: "#dc2626",
    dpi: 400,
    sens: 3.09,
    res: "1280×960",
    aspect: "4:3",
    crosshair: { color: "#00ff00", size: 6, thickness: 1, gap: 3, dot: false, outline: true, alpha: 1 },
    ref: { reflexo: 190, gridshot: 95 },
  },
  {
    id: "niko",
    nome: "NiKo",
    time: "Falcons",
    cor: "#22c55e",
    dpi: 400,
    sens: 1.41,
    res: "1280×960",
    aspect: "4:3",
    crosshair: { color: "#ffffff", size: 4, thickness: 1, gap: 2, dot: false, outline: true, alpha: 1 },
    ref: { reflexo: 196, gridshot: 90 },
  },
  {
    id: "ropz",
    nome: "ropz",
    time: "Vitality",
    cor: "#fde047",
    dpi: 400,
    sens: 1.2,
    res: "1280×960",
    aspect: "4:3",
    crosshair: { color: "#1eff00", size: 2, thickness: 1, gap: 1, dot: true, outline: true, alpha: 1 },
    ref: { reflexo: 205, gridshot: 87 },
  },
  {
    id: "b1t",
    nome: "b1t",
    time: "Natus Vincere",
    cor: "#facc15",
    dpi: 400,
    sens: 2.0,
    res: "1280×960",
    aspect: "4:3",
    crosshair: { color: "#00ffd0", size: 5, thickness: 1, gap: 2, dot: false, outline: true, alpha: 1 },
    ref: { reflexo: 207, gridshot: 86 },
  },
  {
    id: "sh1ro",
    nome: "sh1ro",
    time: "Spirit",
    cor: "#f43f5e",
    dpi: 400,
    sens: 1.6,
    res: "1280×960",
    aspect: "4:3",
    crosshair: { color: "#a855f7", size: 0, thickness: 3, gap: 0, dot: true, outline: true, alpha: 1 },
    ref: { reflexo: 210, gridshot: 85 },
  },
  {
    id: "frozen",
    nome: "frozen",
    time: "Falcons",
    cor: "#22c55e",
    dpi: 400,
    sens: 1.6,
    res: "1280×960",
    aspect: "4:3",
    crosshair: { color: "#00ff00", size: 4, thickness: 1, gap: 2, dot: false, outline: true, alpha: 0.9 },
    ref: { reflexo: 200, gridshot: 88 },
  },
  {
    id: "rain",
    nome: "rain",
    time: "FaZe Clan",
    cor: "#dc2626",
    dpi: 400,
    sens: 1.9,
    res: "1280×960",
    aspect: "4:3",
    crosshair: { color: "#ff0033", size: 6, thickness: 2, gap: 3, dot: false, outline: true, alpha: 1 },
    ref: { reflexo: 214, gridshot: 84 },
  },
];

export function proById(id: string): ProPlayer | undefined {
  return PRO_PLAYERS.find((p) => p.id === id);
}

// Nome amigável de um preset salvo no banco ("pro:donk", "com:..", "classic").
export function presetLabel(preset: string): string {
  if (preset.startsWith("pro:")) return proById(preset.slice(4))?.nome ?? "Pro";
  if (preset.startsWith("com:")) return "Mira da comunidade";
  return presetById(preset)?.nome ?? preset;
}
