"use client";

import { useEffect, useRef, useState } from "react";

import { sfx, resumeAudio } from "@/lib/arena/sound";
import { cn } from "@/lib/utils";
import type { Difficulty, MatchMetrics } from "@/types/arena";

type Fase = "idle" | "esperando" | "pronto" | "cedo";
const RODADAS = 5;
const HKEY = "flaw_reflex_hist";

function loadHist(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HKEY) || "[]");
  } catch {
    return [];
  }
}
function saveHist(h: number[]) {
  localStorage.setItem(HKEY, JSON.stringify(h.slice(-50)));
}

export function ReflexAdvanced({
  difficulty,
  onFinish,
}: {
  difficulty: Difficulty;
  onFinish: (m: MatchMetrics) => void;
}) {
  const [fase, setFase] = useState<Fase>("idle");
  const [rodada, setRodada] = useState(0);
  const [tempos, setTempos] = useState<number[]>([]);
  const [cedos, setCedos] = useState(0);
  const [hist, setHist] = useState<number[]>([]);
  const inicio = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setHist(loadHist()), []);

  const waitRange: Record<Difficulty, [number, number]> = {
    facil: [1500, 3000],
    medio: [1200, 3500],
    dificil: [900, 4200],
    insano: [700, 5000],
  };

  function armar() {
    setFase("esperando");
    const [a, b] = waitRange[difficulty];
    timer.current = setTimeout(() => {
      inicio.current = performance.now();
      sfx.tick();
      setFase("pronto");
    }, a + Math.random() * (b - a));
  }

  function comecar() {
    resumeAudio();
    setTempos([]);
    setCedos(0);
    setRodada(0);
    armar();
  }

  function clicar() {
    if (fase === "esperando") {
      if (timer.current) clearTimeout(timer.current);
      sfx.miss();
      setFase("cedo");
      return;
    }
    if (fase === "pronto") {
      const ms = Math.round(performance.now() - inicio.current);
      sfx.hit();
      const novos = [...tempos, ms];
      const novaRodada = rodada + 1;
      setTempos(novos);
      setRodada(novaRodada);

      if (novaRodada >= RODADAS) {
        const best = Math.min(...novos);
        const avg = Math.round(novos.reduce((s, n) => s + n, 0) / novos.length);
        const novoHist = [...loadHist(), ...novos];
        saveHist(novoHist);
        if (best <= Math.min(...loadHist().concat(best))) sfx.record();
        onFinish({
          valor: best,
          accuracy: null,
          hits: RODADAS,
          misses: cedos,
          combo: 0,
          reacao_media: avg,
          dificuldade: difficulty,
        });
      } else {
        setFase("idle");
        setTimeout(armar, 600);
      }
    }
  }

  const best = hist.length ? Math.min(...hist) : null;
  const avg10 = hist.length
    ? Math.round(hist.slice(-10).reduce((s, n) => s + n, 0) / Math.min(hist.length, 10))
    : null;

  if (fase === "idle" && rodada === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Box label="Melhor" valor={best != null ? `${best} ms` : "—"} cor="text-emerald-400" />
          <Box label="Média (10)" valor={avg10 != null ? `${avg10} ms` : "—"} />
          <Box label="Partidas" valor={`${hist.length}`} />
        </div>

        {hist.length > 1 && <Sparkline valores={hist.slice(-30)} />}

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="max-w-xs text-sm text-zinc-400">
            São <b>{RODADAS} rodadas</b>. Clique assim que a tela ficar{" "}
            <span className="text-emerald-400">verde</span>. Vale o seu melhor tempo.
          </p>
          <button
            type="button"
            onClick={comecar}
            className="inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-6 text-sm font-semibold text-white"
          >
            Começar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>
          Rodada {Math.min(rodada + (fase === "idle" ? 1 : 1), RODADAS)} / {RODADAS}
        </span>
        <span className="tabular-nums">
          {tempos.length > 0 ? `último: ${tempos[tempos.length - 1]} ms` : ""}
        </span>
      </div>

      <button
        type="button"
        onClick={clicar}
        className={cn(
          "grid h-72 w-full place-items-center rounded-2xl text-center text-lg font-bold transition-colors",
          fase === "esperando" && "bg-red-600/90 text-white",
          fase === "pronto" && "bg-emerald-500 text-white",
          (fase === "idle" || fase === "cedo") && "bg-zinc-800 text-zinc-200"
        )}
      >
        {fase === "esperando" && "Espere o verde…"}
        {fase === "pronto" && "CLIQUE!"}
        {fase === "idle" && "Prepare-se…"}
        {fase === "cedo" && (
          <span className="flex flex-col items-center gap-2">
            Cedo demais! 😅
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                setCedos((c) => c + 1);
                armar();
              }}
              className="rounded-lg bg-zinc-700 px-3 py-1 text-sm"
            >
              Repetir rodada
            </span>
          </span>
        )}
      </button>

      <div className="flex flex-wrap gap-1.5">
        {tempos.map((t, i) => (
          <span
            key={i}
            className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium tabular-nums text-zinc-200"
          >
            {t} ms
          </span>
        ))}
      </div>
    </div>
  );
}

function Box({ label, valor, cor = "text-zinc-100" }: { label: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
      <p className={`text-base font-bold ${cor}`}>{valor}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

// Gráfico de evolução simples (menor é melhor → invertido).
function Sparkline({ valores }: { valores: number[] }) {
  const w = 100;
  const h = 32;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = Math.max(1, max - min);
  const pts = valores
    .map((v, i) => {
      const x = (i / (valores.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <p className="mb-1 text-[11px] font-medium tracking-widest text-zinc-500 uppercase">
        Evolução (últimas {valores.length})
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-12 w-full">
        <polyline
          points={pts}
          fill="none"
          stroke="url(#g)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
