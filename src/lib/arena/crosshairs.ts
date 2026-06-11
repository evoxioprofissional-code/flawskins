// Crosshairs profissionais desenhadas em canvas (sem cursor do navegador).

export type CrosshairId =
  | "classic"
  | "dot"
  | "tee"
  | "ring"
  | "sniper"
  | "neon";

export type CrosshairPreset = {
  id: CrosshairId;
  nome: string;
  cor: string;
};

export const CROSSHAIRS: CrosshairPreset[] = [
  { id: "classic", nome: "Classic", cor: "#00ff88" },
  { id: "dot", nome: "Dot", cor: "#00e5ff" },
  { id: "tee", nome: "T-Style", cor: "#ffffff" },
  { id: "ring", nome: "Ring", cor: "#ffcc00" },
  { id: "sniper", nome: "Sniper", cor: "#ff3366" },
  { id: "neon", nome: "Neon", cor: "#c084fc" },
];

export function getCrosshair(id: string): CrosshairPreset {
  return CROSSHAIRS.find((c) => c.id === id) ?? CROSSHAIRS[0];
}

// Desenha a crosshair no contexto, centrada em (x, y).
export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  id: CrosshairId,
  cor: string
) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.lineCap = "round";
  ctx.shadowColor = cor;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = cor;
  ctx.fillStyle = cor;

  const line = (x1: number, y1: number, x2: number, y2: number, w: number) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  const dot = (r: number) => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  };

  switch (id) {
    case "dot":
      dot(2.6);
      break;
    case "classic": {
      const gap = 4,
        len = 7,
        w = 2;
      line(-gap - len, 0, -gap, 0, w);
      line(gap, 0, gap + len, 0, w);
      line(0, -gap - len, 0, -gap, w);
      line(0, gap, 0, gap + len, w);
      dot(1.4);
      break;
    }
    case "tee": {
      const gap = 4,
        len = 8,
        w = 2;
      line(-gap - len, 0, -gap, 0, w);
      line(gap, 0, gap + len, 0, w);
      line(0, gap, 0, gap + len, w);
      break;
    }
    case "ring": {
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.stroke();
      dot(1.6);
      break;
    }
    case "sniper": {
      const w = 1.2;
      line(-22, 0, -5, 0, w);
      line(5, 0, 22, 0, w);
      line(0, -22, 0, -5, w);
      line(0, 5, 0, 22, w);
      dot(1.1);
      break;
    }
    case "neon": {
      const gap = 5,
        len = 9,
        w = 2.6;
      ctx.shadowBlur = 14;
      line(-gap - len, 0, -gap, 0, w);
      line(gap, 0, gap + len, 0, w);
      line(0, -gap - len, 0, -gap, w);
      line(0, gap, 0, gap + len, w);
      break;
    }
  }
  ctx.restore();
}
