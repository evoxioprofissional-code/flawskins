"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";

import { registrarScore } from "@/actions/arena";
import { AimTrainer } from "@/components/arena/AimTrainer";
import { ReflexAdvanced } from "@/components/arena/ReflexAdvanced";
import { CrosshairCanvas } from "@/components/arena/CrosshairCanvas";
import { setMuted, sfx } from "@/lib/arena/sound";
import {
  CROSSHAIR_PRESETS,
  DEFAULT_CROSSHAIR,
  presetById,
  type CrosshairConfig,
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

type Applied = { cfg: CrosshairConfig; preset: string; nome: string };

function loadApplied(): Applied {
  if (typeof window === "undefined")
    return { cfg: DEFAULT_CROSSHAIR, preset: "classic", nome: "Classic" };
  try {
    const cfg = localStorage.getItem("flaw_cross_cfg");
    const preset = localStorage.getItem("flaw_cross_preset");
    const nome = localStorage.getItem("flaw_cross_nome");
    if (cfg && preset) return { cfg: JSON.parse(cfg), preset, nome: nome ?? preset };
  } catch {
    /* ignore */
  }
  return { cfg: DEFAULT_CROSSHAIR, preset: "classic", nome: "Classic" };
}

export function ArenaGameClient({ game }: { game: ArenaGame }) {
  const meta = ARENA_GAMES[game];
  const isReflex = meta.tipo === "reflex";

  const [diff, setDiff] = useState<Difficulty>("medio");
  const [mute, setMute] = useState(false);
  const [round, setRound] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [applied, setApplied] = useState<Applied>({
    cfg: DEFAULT_CROSSHAIR,
    preset: "classic",
    nome: "Classic",
  });
  const [result, setResult] = useState<{
    m: MatchMetrics;
    posicao: number | null;
  } | null>(null);

  useEffect(() => {
    const d = localStorage.getItem("flaw_diff") as Difficulty | null;
    const mu = localStorage.getItem("flaw_mute") === "1";
    if (d) setDiff(d);
    setMute(mu);
    setMuted(mu);
    setApplied(loadApplied());
  }, []);

  function pickDiff(d: Difficulty) {
    setDiff(d);
    localStorage.setItem("flaw_diff", d);
  }
  function pickPreset(id: string) {
    const p = presetById(id);
    if (!p) return;
    const a = { cfg: p.cfg, preset: p.id, nome: p.nome };
    setApplied(a);
    localStorage.setItem("flaw_cross_cfg", JSON.stringify(a.cfg));
    localStorage.setItem("flaw_cross_preset", a.preset);
    localStorage.setItem("flaw_cross_nome", a.nome);
  }
  function toggleMute() {
    const v = !mute;
    setMute(v);
    setMuted(v);
    localStorage.setItem("flaw_mute", v ? "1" : "0");
  }

  async function onFinish(m: MatchMetrics) {
    setEnviando(true);
    const res = await registrarScore(game, m, applied.preset);
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
        preset={applied.nome}
        posicao={result.posicao}
        enviando={enviando}
        onReplay={replay}
      />
    );
  }

  const ehPreset = CROSSHAIR_PRESETS.some((p) => p.id === applied.preset);

  return (
    <div className="space-y-4">
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

      {!isReflex && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            Mira
          </span>
          {CROSSHAIR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPreset(p.id)}
              title={p.nome}
              className={cn(
                "grid size-10 place-items-center rounded-lg border bg-zinc-950 transition-colors",
                p.id === applied.preset
                  ? "border-violet-500 ring-1 ring-violet-500/50"
                  : "border-zinc-800 hover:bg-zinc-800"
              )}
            >
              <CrosshairCanvas cfg={p.cfg} size={34} />
            </button>
          ))}
          {!ehPreset && (
            <span className="inline-flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-200">
              <CrosshairCanvas cfg={applied.cfg} size={22} />
              {applied.nome}
            </span>
          )}
          <Link
            href="/arena/pro-lab"
            className="ml-auto text-xs text-violet-400 hover:underline"
          >
            Pro Lab →
          </Link>
        </div>
      )}

      {isReflex ? (
        <ReflexAdvanced key={`${round}-${diff}`} difficulty={diff} onFinish={onFinish} />
      ) : (
        <AimTrainer
          key={`${round}-${diff}-${applied.preset}`}
          game={game}
          difficulty={diff}
          crosshair={applied.cfg}
          crosshairNome={applied.nome}
          onFinish={onFinish}
        />
      )}
    </div>
  );
}

function RichResult({
  game,
  m,
  preset,
  posicao,
  enviando,
  onReplay,
}: {
  game: ArenaGame;
  m: MatchMetrics;
  preset: string;
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
      <p className="mt-1 text-xs text-zinc-500">Mira: {preset}</p>
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
