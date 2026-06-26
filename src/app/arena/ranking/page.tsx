import Link from "next/link";
import type { Metadata } from "next";

import { getUser } from "@/lib/auth";
import { getRanking } from "@/actions/arena";
import {
  ARENA_GAMES,
  ARENA_GAME_SLUGS,
  ARENA_PERIODS,
  PERIOD_LABEL,
  isArenaGame,
  type ArenaGame,
  type ArenaPeriod,
} from "@/types/arena";
import { RankingList } from "@/components/arena/RankingList";
import { BackButton } from "@/components/layout/BackButton";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rankings — Vision Arena" };
export const dynamic = "force-dynamic";

type Search = { game?: string; period?: string };

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const game: ArenaGame = isArenaGame(sp.game ?? "") ? (sp.game as ArenaGame) : "gridshot";
  const period: ArenaPeriod = (ARENA_PERIODS as readonly string[]).includes(
    sp.period ?? ""
  )
    ? (sp.period as ArenaPeriod)
    : "geral";

  const [user, rows] = await Promise.all([getUser(), getRanking(game, period)]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <BackButton className="mb-4" fallback="/arena" />

      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Rankings da Arena
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Os melhores jogadores da comunidade Vision Skins.
        </p>
      </header>

      {/* Tabs de jogo */}
      <div className="mb-3 flex flex-wrap gap-2">
        {ARENA_GAME_SLUGS.map((g) => (
          <Link
            key={g}
            href={`/arena/ranking?game=${g}&period=${period}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              g === game
                ? "border-violet-500 bg-violet-500/15 text-violet-200"
                : "border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            )}
          >
            {ARENA_GAMES[g].nome}
          </Link>
        ))}
      </div>

      {/* Tabs de período */}
      <div className="mb-4 flex flex-wrap gap-2">
        {ARENA_PERIODS.map((p) => (
          <Link
            key={p}
            href={`/arena/ranking?game=${game}&period=${p}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              p === period
                ? "bg-fuchsia-500 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            )}
          >
            {PERIOD_LABEL[p]}
          </Link>
        ))}
      </div>

      <RankingList game={game} rows={rows} destacarUser={user?.id} />
    </div>
  );
}
