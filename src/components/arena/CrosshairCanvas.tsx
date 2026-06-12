"use client";

import { useEffect, useRef } from "react";

import { drawCrosshairCfg, type CrosshairConfig } from "@/lib/arena/crosshairs";

// Renderiza uma crosshair em tempo real a partir dos parâmetros reais.
export function CrosshairCanvas({
  cfg,
  size = 56,
  className,
}: {
  cfg: CrosshairConfig;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = size * dpr;
    c.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    drawCrosshairCfg(ctx, size / 2, size / 2, cfg);
  }, [cfg, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className={className}
    />
  );
}
