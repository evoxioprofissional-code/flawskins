import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getUser } from "@/lib/auth";
import { getRanking } from "@/actions/arena";
import { ARENA_GAMES, isArenaGame } from "@/types/arena";
import { ArenaGameClient } from "@/components/arena/ArenaGameClient";
import { RankingList } from "@/components/arena/RankingList";
import { BackButton } from "@/components/layout/BackButton";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ game: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { game } = await params;
  if (!isArenaGame(game)) return { title: "Flaw Arena — FlawSkins" };
  return { title: `${ARENA_GAMES[game].nome} — Flaw Arena` };
}

export default async function ArenaGamePage({ params }: Params) {
  const { game } = await params;
  if (!isArenaGame(game)) notFound();

  const [user, top] = await Promise.all([getUser(), getRanking(game, "geral")]);
  const meta = ARENA_GAMES[game];

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <BackButton className="mb-4" fallback="/arena" />

      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          {meta.nome}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{meta.desc}</p>
      </header>

      {user ? (
        <ArenaGameClient game={game} />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center">
          <p className="text-sm text-zinc-400">
            Entre para jogar e registrar sua pontuação no ranking.
          </p>
          <Link
            href={`/login?next=/arena/${game}`}
            className="inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-6 text-sm font-semibold text-white"
          >
            Entrar para jogar
          </Link>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Top jogadores</h2>
          <Link
            href={`/arena/ranking?game=${game}`}
            className="text-xs text-violet-400 hover:underline"
          >
            ver todos
          </Link>
        </div>
        <RankingList game={game} rows={top.slice(0, 5)} destacarUser={user?.id} />
      </section>
    </div>
  );
}
