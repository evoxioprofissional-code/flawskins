"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";

import { registrarScore } from "@/actions/arena";
import { AimTrainer } from "@/components/arena/AimTrainer";
import { ReflexAdvanced } from "@/components/arena/ReflexAdvanced";
import { setMuted, sfx } from "@/lib/arena/sound";
import {
  CROSSHAIRS,
  drawCrosshair,
  type CrosshairId,
} from "@/lib/arena/crosshairs";
import {
  ARENA_GAMES,
  DIFFICULTIES,
  DIFF_LABEL,
  formatScore,
  type ArenaGame,
  type Difficulty,
  type MatchMetrics,
} from "@/types/arena";
import { cn } from "@/lib/utils";

export function ArenaGameClient({ game }: { game: ArenaGame }) {
  const meta = ARENA_GAMES[game];
  const isReflex = meta.tipo === "reflex";

  const [diff, setDiff] = useState<Difficulty>("medio");
  const [cross, setCross] = useState<CrosshairId>("classic");
  const [mute, setMute] = useState(false);
  const [round, setRound] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [result, setResult] = useState<{
    m: MatchMetrics;
    posicao: number | null;
  } | null>(null);

  // Preferências persistidas.
  useEffect(() => {
    const d = localStorage.getItem("flaw_diff") as Difficulty | null;
    const c = localStorage.getItem("flaw_cross") as CrosshairId | null;
    const mu = localStorage.getItem("flaw_mute") === "1";
    if (d) setDiff(d);
    if (c) setCross(c);
    setMute(mu);
    setMuted(mu);
  }, []);

  function pickDiff(d: Difficulty) {
    setDiff(d);
    localStorage.setItem("flaw_diff", d);
  }
  function pickCross(c: CrosshairId) {
    setCross(c);
    localStorage.setItem("flaw_cross", c);
  }
  function toggleMute() {
    const v = !mute;
    setMute(v);
    setMuted(v);
    localStorage.setItem("flaw_mute", v ? "1" : "0");
  }

  async function onFinish(m: MatchMetrics) {
    setEnviando(true);
    const res = await registrarScore(game, m);
    setEnviando(false);
    if (!res.ok) {
      toast.error(res.error);
      setResult({ m, posicao: null });
      return;
    }
    if (res.data.posicao && res.data.posicao <= 3) sfx.record();
    setResult({ m, posicao: res.data.posicao });
  }

  function replay() {
    setResult(null);
    setRound((r) => r + 1);
  }

  if (result) {
    return (
      <RichResult
        game={game}
        m={result.m}
        posicao={result.posicao}
        enviando={enviando}
        onReplay={replay}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Dificuldade + som */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          Dificuldade
        </span>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => pickDiff(d)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              d === diff
                ? "border-orange-500 bg-orange-500/15 text-orange-300"
                : "border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            )}
          >
            {DIFF_LABEL[d]}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleMute}
          aria-label="Som"
          className="ml-auto grid size-9 place-items-center rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
        >
          {mute ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      {/* Crosshair (só pros modos de mira) */}
      {!isReflex && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            Mira
          </span>
          {CROSSHAIRS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickCross(c.id)}
              title={c.nome}
              className={cn(
                "grid size-10 place-items-center rounded-lg border bg-zinc-950 transition-colors",
                c.id === cross
                  ? "border-violet-500 ring-1 ring-violet-500/50"
                  : "border-zinc-800 hover:bg-zinc-800"
              )}
            >
              <CrosshairPreview id={c.id} cor={c.cor} />
            </button>
          ))}
        </div>
      )}

      {/* Trainer */}
      {isReflex ? (
        <ReflexAdvanced key={`${round}-${diff}`} difficulty={diff} onFinish={onFinish} />
      ) : (
        <AimTrainer
          key={`${round}-${diff}-${cross}`}
          game={game}
          difficulty={diff}
          crosshairId={cross}
          onFinish={onFinish}
        />
      )}
    </div>
  );
}

function CrosshairPreview({ id, cor }: { id: CrosshairId; cor: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 34 * dpr;
    c.height = 34 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 34, 34);
    drawCrosshair(ctx, 17, 17, id, cor);
  }, [id, cor]);
  return <canvas ref={ref} style={{ width: 34, height: 34 }} />;
}

function RichResult({
  game,
  m,
  posicao,
  enviando,
  onReplay,
}: {
  game: ArenaGame;
  m: MatchMetrics;
  posicao: number | null;
  enviando: boolean;
  onReplay: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
      <p className="text-sm font-medium tracking-widest text-zinc-500 uppercase">
        Resultado · {DIFF_LABEL[m.dificuldade]}
      </p>
      <p className="mt-2 text-5xl font-black text-zinc-50">
        {formatScore(game, m.valor)}
      </p>
      {enviando ? (
        <p className="mt-2 text-sm text-zinc-400">Salvando…</p>
      ) : posicao ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-200">
          <Trophy className="size-4" /> {posicao}º no ranking geral
        </p>
      ) : null}

      <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
        {m.accuracy != null && <Mini label="Accuracy" v={`${m.accuracy}%`} />}
        <Mini label="Acertos" v={`${m.hits}`} />
        <Mini label="Erros" v={`${m.misses}`} />
        {m.combo > 0 && <Mini label="Combo" v={`${m.combo}`} />}
        {m.reacao_media != null && <Mini label="Reação média" v={`${m.reacao_media} ms`} />}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-5 text-sm font-semibold text-white"
        >
          <RotateCcw className="size-4" /> Jogar de novo
        </button>
        <Link
          href={`/arena/ranking?game=${game}`}
          className="inline-flex h-11 items-center rounded-xl border border-zinc-700 px-5 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
        >
          Ver ranking
        </Link>
      </div>
    </div>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2">
      <p className="text-sm font-bold text-zinc-100">{v}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
