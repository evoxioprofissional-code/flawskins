import Link from "next/link";
import { Swords } from "lucide-react";

import {
  achievementLabel,
  ARENA_GAMES,
  ARENA_GAME_SLUGS,
  formatScore,
  type ArenaStats,
} from "@/types/arena";
import { RankBadge } from "@/components/arena/RankBadge";

function pos(n: number | null | undefined) {
  return n ? `${n}º` : "—";
}

export function ArenaStatsPanel({ stats }: { stats: ArenaStats | null }) {
  const semDados =
    !stats || (stats.partidas === 0 && (stats.conquistas?.length ?? 0) === 0);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-zinc-100">
          <Swords className="size-4 text-violet-400" />
          Vision Arena Stats
        </h2>
        {stats && <RankBadge tier={stats.tier} />}
      </div>

      {semDados ? (
        <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center">
          <p className="text-sm text-zinc-400">Ainda não jogou na Arena.</p>
          <Link
            href="/arena"
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 text-sm font-semibold text-white"
          >
            Entrar na Arena
          </Link>
        </div>
      ) : (
        <>
          {/* Melhores por modo */}
          <div className="grid grid-cols-3 gap-2">
            {ARENA_GAME_SLUGS.map((g) => {
              const j = stats!.jogos[g];
              return (
                <div
                  key={g}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-center"
                >
                  <p className="truncate text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                    {ARENA_GAMES[g].curto}
                  </p>
                  <p className="mt-1 text-sm font-bold text-zinc-50">
                    {formatScore(g, j?.best ?? null)}
                  </p>
                  <p className="text-xs text-violet-300">{pos(j?.pos)}</p>
                </div>
              );
            })}
          </div>

          {/* Agregados */}
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Mini label="Rating" v={stats!.rating} />
            <Mini label="Partidas" v={stats!.partidas} />
            <Mini label="Accuracy" v={stats!.media_accuracy != null ? `${stats!.media_accuracy}%` : "—"} />
            <Mini label="Combo" v={stats!.best_combo} />
            <Mini label="Sequência" v={`${stats!.streak}d`} />
            <Mini label="Títulos" v={stats!.temporadas_vencidas} />
          </div>

          {/* Medalhas */}
          {stats!.conquistas.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                Medalhas e conquistas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {stats!.conquistas.map((code) => {
                  const a = achievementLabel(code);
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-200"
                      title={a.label}
                    >
                      <span aria-hidden>{a.emoji}</span>
                      {a.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Mini({ label, v }: { label: string; v: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center">
      <p className="text-sm font-bold text-zinc-100">{v}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
