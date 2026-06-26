"use client";

import { useEffect, useRef, useState } from "react";

import { sfx, resumeAudio } from "@/lib/arena/sound";
import { drawCrosshairCfg, type CrosshairConfig } from "@/lib/arena/crosshairs";
import {
  ARENA_GAMES,
  DIFF_PARAMS,
  type ArenaGame,
  type Difficulty,
  type MatchMetrics,
} from "@/types/arena";

type Target = {
  x: number;
  y: number;
  r: number;
  headR: number;
  born: number;
  life: number; // ms; 0 = sem expiração
  vx: number;
  vy: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

type Float = { x: number; y: number; vy: number; life: number; text: string; color: string };
type Ring = { x: number; y: number; r: number; life: number; color: string };

const DURATION = 30000; // ms

export function AimTrainer({
  game,
  difficulty,
  crosshair,
  crosshairNome,
  onFinish,
}: {
  game: ArenaGame;
  difficulty: Difficulty;
  crosshair: CrosshairConfig;
  crosshairNome?: string;
  onFinish: (m: MatchMetrics) => void;
}) {
  const [phase, setPhase] = useState<"intro" | "play">("intro");
  const [hud, setHud] = useState({
    restante: DURATION / 1000,
    score: 0,
    hits: 0,
    misses: 0,
    acc: 100,
    combo: 0,
    best: 0,
    extra: "",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (phase !== "play") return;
    const canvas = canvasRef.current!;
    const container = containerRef.current!;
    const ctx = canvas.getContext("2d")!;
    const accent = ARENA_GAMES[game].accent;
    const d = DIFF_PARAMS[difficulty];

    let W = 0;
    let H = 0;
    const pad = 40;

    function resize() {
      const rect = container.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const pointer = { x: W / 2, y: H / 2 };
    function onMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    }
    canvas.addEventListener("pointermove", onMove);

    // ---- estado do jogo ----
    const st = {
      targets: [] as Target[],
      particles: [] as Particle[],
      floats: [] as Float[],
      rings: [] as Ring[],
      score: 0,
      hits: 0,
      misses: 0,
      combo: 0,
      best: 0,
      reactions: [] as number[],
      timeOnTarget: 0,
      missFlash: 0,
      start: performance.now(),
      lastSpawn: 0,
      covers: [] as { x: number; y: number; w: number; h: number }[],
    };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    function farPos(px: number, py: number, r: number, minDist: number) {
      for (let i = 0; i < 30; i++) {
        const x = rand(pad + r, W - pad - r);
        const y = rand(pad + r, H - pad - r);
        if (Math.hypot(x - px, y - py) >= minDist || i > 20) return { x, y };
      }
      return { x: W / 2, y: H / 2 };
    }

    function baseRadius() {
      const map: Record<string, number> = {
        gridshot: 22,
        microflick: 15,
        tracking: 34,
        peek: 17,
        headshot: 30,
        reflexo: 30,
      };
      return map[game] * d.size;
    }

    function mkTarget(px = W / 2, py = H / 2, minDist = 0): Target {
      const r = baseRadius();
      const p = farPos(px, py, r, minDist);
      let life = 0;
      if (game === "microflick") life = 1000 * d.life;
      if (game === "peek") life = 780 * d.life;
      if (game === "headshot") life = 1500 * d.life;
      return { x: p.x, y: p.y, r, headR: r * 0.42, born: performance.now(), life, vx: 0, vy: 0 };
    }

    // setup inicial por modo
    if (game === "gridshot") {
      for (let i = 0; i < 3; i++) st.targets.push(mkTarget(rand(0, W), rand(0, H), 0));
    } else if (game === "tracking") {
      const t = mkTarget();
      const ang = rand(0, Math.PI * 2);
      const sp = 150 * d.speed;
      t.vx = Math.cos(ang) * sp;
      t.vy = Math.sin(ang) * sp;
      st.targets.push(t);
    } else if (game === "peek") {
      // coberturas
      const n = 4;
      for (let i = 0; i < n; i++) {
        const w = rand(60, 120);
        const h = rand(80, 160);
        st.covers.push({
          x: rand(pad, W - pad - w),
          y: rand(pad, H - pad - h),
          w,
          h,
        });
      }
      st.targets.push(mkPeek());
    } else {
      st.targets.push(mkTarget(W / 2, H / 2, 200));
    }

    function mkPeek(): Target {
      const r = baseRadius();
      const cover = st.covers[Math.floor(rand(0, st.covers.length))];
      const side = Math.random() < 0.5 ? -1 : 1;
      const x =
        side < 0 ? cover.x - r * 0.5 : cover.x + cover.w + r * 0.5;
      const y = rand(cover.y + r, cover.y + cover.h - r);
      return {
        x: Math.max(pad + r, Math.min(W - pad - r, x)),
        y,
        r,
        headR: r * 0.42,
        born: performance.now(),
        life: 780 * d.life,
        vx: 0,
        vy: 0,
      };
    }

    function burst(x: number, y: number, color: string, n = 14) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(60, 260);
        st.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: rand(0.3, 0.6),
          max: 0.6,
          size: rand(1.5, 3.5),
          color,
        });
      }
    }
    function float(x: number, y: number, text: string, color: string) {
      st.floats.push({ x, y, vy: -60, life: 0.8, text, color });
    }
    function ringFx(x: number, y: number, color: string) {
      st.rings.push({ x, y, r: 4, life: 0.4, color });
    }

    function registrarAcerto(t: Target, head: boolean, x: number, y: number) {
      st.hits++;
      st.combo++;
      if (st.combo > st.best) st.best = st.combo;
      let pts = 10 + Math.min(st.combo, 40);
      if (head) pts += 8;
      if (game === "microflick" || game === "peek") {
        const reac = performance.now() - t.born;
        st.reactions.push(reac);
        pts = Math.max(8, Math.round(40 + (700 - Math.min(reac, 700)) / 12));
      }
      st.score += pts;
      burst(x, y, head ? "#fde047" : accent, head ? 22 : 14);
      ringFx(x, y, head ? "#fde047" : accent);
      float(x, y, `+${pts}${head ? " HS" : ""}`, head ? "#fde047" : "#ffffff");
      if (head) sfx.head();
      else sfx.hit();
    }

    function registrarErro(x: number, y: number, penal = 6) {
      st.misses++;
      st.combo = 0;
      st.score = Math.max(0, st.score - penal);
      st.missFlash = 1;
      burst(x, y, "#ef4444", 8);
      sfx.miss();
    }

    function onShoot(e: PointerEvent) {
      if (game === "tracking") return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // headshot: cabeça acima do corpo
      for (let i = 0; i < st.targets.length; i++) {
        const t = st.targets[i];
        if (game === "headshot") {
          const hx = t.x;
          const hy = t.y - t.r * 0.7;
          if (Math.hypot(x - hx, y - hy) <= t.headR) {
            registrarAcerto(t, true, hx, hy);
            st.targets[i] = mkTarget(t.x, t.y, 180);
            return;
          }
          if (Math.hypot(x - t.x, y - t.y) <= t.r) {
            registrarErro(x, y, 4); // acertou o corpo
            st.targets[i] = mkTarget(t.x, t.y, 180);
            return;
          }
        } else {
          const dist = Math.hypot(x - t.x, y - t.y);
          if (dist <= t.r) {
            const head = dist <= t.r * 0.34;
            registrarAcerto(t, head, t.x, t.y);
            if (game === "gridshot") st.targets[i] = mkTarget(t.x, t.y, 200);
            else if (game === "microflick") st.targets[i] = mkTarget(t.x, t.y, 240);
            else if (game === "peek") st.targets[i] = mkPeek();
            return;
          }
        }
      }
      registrarErro(x, y);
    }
    canvas.addEventListener("pointerdown", onShoot);

    function expirar(i: number) {
      // alvo sumiu sem ser acertado
      st.combo = 0;
      st.misses++;
      const t = st.targets[i];
      if (game === "gridshot") st.targets[i] = mkTarget(t.x, t.y, 200);
      else if (game === "microflick") st.targets[i] = mkTarget(t.x, t.y, 240);
      else if (game === "peek") st.targets[i] = mkPeek();
      else if (game === "headshot") st.targets[i] = mkTarget(t.x, t.y, 180);
    }

    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;

    function loop(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = now - st.start;
      const restante = Math.max(0, DURATION - elapsed);

      // ---- update ----
      if (game === "tracking") {
        const t = st.targets[0];
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        if (t.x < pad + t.r || t.x > W - pad - t.r) {
          t.vx *= -1;
          t.x = Math.max(pad + t.r, Math.min(W - pad - t.r, t.x));
        }
        if (t.y < pad + t.r || t.y > H - pad - t.r) {
          t.vy *= -1;
          t.y = Math.max(pad + t.r, Math.min(H - pad - t.r, t.y));
        }
        // leve mudança de direção
        if (Math.random() < 0.012) {
          const a = rand(0, Math.PI * 2);
          const sp = 150 * d.speed;
          t.vx = Math.cos(a) * sp;
          t.vy = Math.sin(a) * sp;
        }
        const over = Math.hypot(pointer.x - t.x, pointer.y - t.y) <= t.r;
        if (over) {
          st.timeOnTarget += dt;
          st.score += dt * 70;
          if (Math.random() < 0.25) burst(t.x, t.y, accent, 1);
        }
      } else {
        for (let i = 0; i < st.targets.length; i++) {
          const t = st.targets[i];
          if (t.life > 0 && now - t.born > t.life) expirar(i);
        }
      }

      // partículas
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          st.particles.splice(i, 1);
          continue;
        }
        p.vy += 320 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = st.floats.length - 1; i >= 0; i--) {
        const f = st.floats[i];
        f.life -= dt;
        f.y += f.vy * dt;
        if (f.life <= 0) st.floats.splice(i, 1);
      }
      for (let i = st.rings.length - 1; i >= 0; i--) {
        const r = st.rings[i];
        r.life -= dt;
        r.r += 160 * dt;
        if (r.life <= 0) st.rings.splice(i, 1);
      }
      if (st.missFlash > 0) st.missFlash = Math.max(0, st.missFlash - dt * 3);

      // ---- draw ----
      ctx.clearRect(0, 0, W, H);

      // coberturas (peek)
      if (game === "peek") {
        for (const c of st.covers) {
          ctx.fillStyle = "rgba(63,63,70,0.55)";
          ctx.strokeStyle = "rgba(113,113,122,0.6)";
          ctx.lineWidth = 2;
          roundRect(ctx, c.x, c.y, c.w, c.h, 8);
          ctx.fill();
          ctx.stroke();
        }
      }

      // alvos
      for (const t of st.targets) drawTarget(ctx, t, accent, now, game);

      // peek: redesenha frente da cobertura por cima (efeito de "atrás")
      if (game === "peek") {
        for (const c of st.covers) {
          ctx.fillStyle = "rgba(39,39,42,0.9)";
          roundRect(ctx, c.x, c.y, c.w, c.h, 8);
          ctx.fill();
        }
      }

      // rings de hit
      for (const r of st.rings) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, r.life / 0.4);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // partículas
      for (const p of st.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // floats
      for (const f of st.floats) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, f.life / 0.8);
        ctx.fillStyle = f.color;
        ctx.font = "bold 16px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 4;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }

      // vinheta de erro
      if (st.missFlash > 0) {
        const g = ctx.createRadialGradient(
          W / 2,
          H / 2,
          Math.min(W, H) * 0.3,
          W / 2,
          H / 2,
          Math.max(W, H) * 0.7
        );
        g.addColorStop(0, "rgba(239,68,68,0)");
        g.addColorStop(1, `rgba(239,68,68,${0.35 * st.missFlash})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // crosshair
      drawCrosshairCfg(ctx, pointer.x, pointer.y, crosshair);

      // HUD throttle
      hudAcc += dt;
      if (hudAcc >= 0.08) {
        hudAcc = 0;
        const total = st.hits + st.misses;
        const acc =
          game === "tracking"
            ? Math.round((st.timeOnTarget / Math.max(0.5, elapsed / 1000)) * 100)
            : total
              ? Math.round((st.hits / total) * 100)
              : 100;
        setHud({
          restante: restante / 1000,
          score: Math.round(st.score),
          hits: st.hits,
          misses: st.misses,
          acc,
          combo: st.combo,
          best: st.best,
          extra:
            game === "tracking"
              ? `${st.timeOnTarget.toFixed(1)}s no alvo`
              : "",
        });
      }

      if (restante <= 0) {
        finalizar();
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    function finalizar() {
      sfx.end();
      const total = st.hits + st.misses;
      const acc =
        game === "tracking"
          ? (st.timeOnTarget / (DURATION / 1000)) * 100
          : total
            ? (st.hits / total) * 100
            : 0;
      const reac =
        st.reactions.length > 0
          ? st.reactions.reduce((a, b) => a + b, 0) / st.reactions.length
          : null;
      onFinish({
        valor: Math.max(0, Math.round(st.score)),
        accuracy: Math.round(acc),
        hits: game === "tracking" ? Math.round(st.timeOnTarget) : st.hits,
        misses: st.misses,
        combo: st.best,
        reacao_media: reac ? Math.round(reac) : null,
        dificuldade: difficulty,
      });
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onShoot);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const meta = ARENA_GAMES[game];

  return (
    <div
      ref={containerRef}
      className="relative h-[60vh] max-h-[560px] min-h-[380px] w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
      style={{
        cursor: phase === "play" ? "none" : "default",
        backgroundImage:
          "radial-gradient(circle, rgba(139,92,246,0.07) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      {phase === "play" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center gap-x-4 gap-y-1 bg-gradient-to-b from-zinc-950/90 to-transparent px-4 py-2.5 text-sm">
          <HudItem label="Tempo" valor={`${hud.restante.toFixed(1)}s`} destaque />
          <HudItem label="Score" valor={hud.score.toLocaleString("pt-BR")} cor="text-fuchsia-400" />
          {game === "tracking" ? (
            <>
              <HudItem label="Tracking" valor={`${hud.acc}%`} cor="text-violet-300" />
              <HudItem label="" valor={hud.extra} />
            </>
          ) : (
            <>
              <HudItem label="Acc" valor={`${hud.acc}%`} cor="text-emerald-400" />
              <HudItem label="Combo" valor={`${hud.combo}`} cor="text-violet-300" />
              <HudItem label="Recorde combo" valor={`${hud.best}`} />
              <HudItem label="Hits" valor={`${hud.hits}`} />
              <HudItem label="Miss" valor={`${hud.misses}`} cor="text-red-400" />
            </>
          )}
        </div>
      )}

      {phase === "intro" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-zinc-950/70 p-6 text-center backdrop-blur-sm">
          <h2 className="text-xl font-bold text-zinc-100">{meta.nome}</h2>
          <p className="max-w-sm text-sm text-zinc-400">{meta.desc}</p>
          <p className="text-xs text-zinc-500">
            Cursor escondido · crosshair {crosshairNome ?? "custom"} · 30s
          </p>
          <button
            type="button"
            onClick={() => {
              resumeAudio();
              sfx.start();
              setPhase("play");
            }}
            className="inline-flex h-12 items-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-8 text-base font-bold text-white shadow-[0_0_30px_-6px] shadow-violet-500/60"
          >
            Iniciar treino
          </button>
        </div>
      )}
    </div>
  );
}

function HudItem({
  label,
  valor,
  cor = "text-zinc-100",
  destaque = false,
}: {
  label: string;
  valor: string;
  cor?: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      {label && (
        <span className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
          {label}
        </span>
      )}
      <span className={`font-bold tabular-nums ${cor} ${destaque ? "text-base" : ""}`}>
        {valor}
      </span>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTarget(
  ctx: CanvasRenderingContext2D,
  t: Target,
  accent: string,
  now: number,
  game: ArenaGame
) {
  const pulse = 1 + Math.sin(now / 200) * 0.04;
  const r = t.r * pulse;

  // expiração: encolhe para dar urgência
  let scale = 1;
  if (t.life > 0) {
    const k = (now - t.born) / t.life;
    scale = 1 - k * 0.25;
  }
  const rr = r * scale;

  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;

  const grad = ctx.createRadialGradient(t.x, t.y, rr * 0.2, t.x, t.y, rr);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.35, accent);
  grad.addColorStop(1, shade(accent, -0.4));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(t.x, t.y, rr, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (game === "headshot") {
    // cabeça
    const hx = t.x;
    const hy = t.y - t.r * 0.7;
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 16;
    const hg = ctx.createRadialGradient(hx, hy, t.headR * 0.2, hx, hy, t.headR);
    hg.addColorStop(0, "#fffef0");
    hg.addColorStop(1, "#f59e0b");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(hx, hy, t.headR, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // miolo (zona de headshot bonus)
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(t.x, t.y, Math.max(2, rr * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + r * amt)));
  g = Math.max(0, Math.min(255, Math.round(g + g * amt)));
  b = Math.max(0, Math.min(255, Math.round(b + b * amt)));
  return `rgb(${r},${g},${b})`;
}
