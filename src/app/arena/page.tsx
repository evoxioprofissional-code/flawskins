import Link from "next/link";
import type { Metadata } from "next";
import {
  Crosshair,
  Eye,
  Move,
  Skull,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getArenaStats } from "@/actions/arena";
import { ARENA_GAMES, type ArenaGame } from "@/types/arena";
import { ArenaStatsPanel } from "@/components/arena/ArenaStatsPanel";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Vision Arena — Vision Skins" };
export const dynamic = "force-dynamic";

const ICONS: Record<ArenaGame, LucideIcon> = {
  gridshot: Target,
  microflick: Crosshair,
  tracking: Move,
  peek: Eye,
  headshot: Skull,
  reflexo: Zap,
};

export default async function ArenaPage() {
  const user = await getUser();
  const supabase = await createClient();

  const [{ data: season }, stats] = await Promise.all([
    supabase
      .from("arena_seasons")
      .select("nome, ends_at")
      .eq("status", "ativa")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ nome: string; ends_at: string }>(),
    user ? getArenaStats(user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <BackButton className="mb-4" />

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Vision{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Arena
            </span>
          </h1>
          {season && (
            <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300">
              {season.nome}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Treine a mira, suba no ranking e dispute temporadas com a comunidade.
        </p>
      </header>

      {/* Jogos */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.values(ARENA_GAMES) as (typeof ARENA_GAMES)[ArenaGame][]).map(
          (g) => {
            const Icon = ICONS[g.slug];
            return (
              <Link
                key={g.slug}
                href={`/arena/${g.slug}`}
                className="group flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-violet-500/50 hover:shadow-[0_0_24px_-8px] hover:shadow-violet-500/40"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-300">
                  <Icon className="size-6" />
                </span>
                <span className="text-base font-semibold text-zinc-100">
                  {g.nome}
                </span>
                <span className="text-xs leading-snug text-zinc-400">
                  {g.desc}
                </span>
              </Link>
            );
          }
        )}
      </div>

      {/* Suas stats */}
      <div className="mt-6">
        {user ? (
          <ArenaStatsPanel stats={stats} />
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">
              Entre para jogar, pontuar e aparecer no ranking.
            </p>
            <Link
              href="/login?next=/arena"
              className="mt-3 inline-flex h-10 items-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-sm font-semibold text-white"
            >
              Entrar
            </Link>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          href="/arena/pro-lab"
          className="flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 py-3 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/20"
        >
          <Crosshair className="size-4" /> Pro Player Lab
        </Link>
        <Link
          href="/arena/ranking"
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          <Trophy className="size-4 text-yellow-400" /> Rankings
        </Link>
      </div>
    </div>
  );
}
