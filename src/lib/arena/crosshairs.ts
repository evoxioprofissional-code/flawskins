// Crosshair por parâmetros — renderizada em canvas (sem cursor do navegador).
// Serve tanto para presets internos quanto para miras de pros e da comunidade.

export type CrosshairConfig = {
  color: string; // hex
  size: number; // comprimento das linhas (px)
  thickness: number; // espessura (px)
  gap: number; // distância do centro (px)
  dot: boolean; // ponto central
  outline: boolean; // contorno preto
  alpha: number; // 0..1 (transparência)
  tStyle?: boolean; // estilo T (sem linha de cima)
  ring?: boolean; // estilo círculo
};

export const DEFAULT_CROSSHAIR: CrosshairConfig = {
  color: "#00ff88",
  size: 7,
  thickness: 2,
  gap: 4,
  dot: true,
  outline: true,
  alpha: 1,
};

export type CrosshairPreset = { id: string; nome: string; cfg: CrosshairConfig };

export const CROSSHAIR_PRESETS: CrosshairPreset[] = [
  { id: "classic", nome: "Classic", cfg: DEFAULT_CROSSHAIR },
  {
    id: "dot",
    nome: "Dot",
    cfg: { color: "#00e5ff", size: 0, thickness: 5, gap: 0, dot: true, outline: true, alpha: 1 },
  },
  {
    id: "tee",
    nome: "T-Style",
    cfg: { color: "#ffffff", size: 8, thickness: 2, gap: 4, dot: false, outline: true, alpha: 1, tStyle: true },
  },
  {
    id: "ring",
    nome: "Ring",
    cfg: { color: "#ffcc00", size: 3, thickness: 1.6, gap: 7, dot: true, outline: true, alpha: 1, ring: true },
  },
  {
    id: "sniper",
    nome: "Sniper",
    cfg: { color: "#ff3366", size: 16, thickness: 1, gap: 5, dot: true, outline: true, alpha: 0.9 },
  },
  {
    id: "neon",
    nome: "Neon",
    cfg: { color: "#c084fc", size: 9, thickness: 3, gap: 5, dot: false, outline: false, alpha: 1 },
  },
];

export function presetById(id: string): CrosshairPreset | undefined {
  return CROSSHAIR_PRESETS.find((p) => p.id === id);
}

export function drawCrosshairCfg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  c: CrosshairConfig
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0.1, Math.min(1, c.alpha ?? 1));
  ctx.translate(Math.round(x) + 0.5, Math.round(y) + 0.5);
  ctx.lineCap = "butt";

  const lines = (w: number, color: string) => {
    if (c.size <= 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    const seg = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    seg(-c.gap - c.size, 0, -c.gap, 0);
    seg(c.gap, 0, c.gap + c.size, 0);
    if (!c.tStyle) seg(0, -c.gap - c.size, 0, -c.gap);
    seg(0, c.gap, 0, c.gap + c.size);
  };
  const ring = (w: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(0, 0, c.gap + c.size, 0, Math.PI * 2);
    ctx.stroke();
  };
  const dot = (r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const dotR = Math.max(1, c.thickness / 2 + 0.5);

  if (c.outline) {
    ctx.shadowBlur = 0;
    if (c.ring) ring(c.thickness + 2, "rgba(0,0,0,0.85)");
    else lines(c.thickness + 2, "rgba(0,0,0,0.85)");
    if (c.dot) dot(dotR + 1, "rgba(0,0,0,0.85)");
  }

  ctx.shadowColor = c.color;
  ctx.shadowBlur = 5;
  if (c.ring) ring(c.thickness, c.color);
  else lines(c.thickness, c.color);
  if (c.dot) dot(dotR, c.color);

  ctx.restore();
}
