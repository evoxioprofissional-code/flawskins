import Link from "next/link";

import { formatScore, type ArenaGame, type RankingRow } from "@/types/arena";
import { cn } from "@/lib/utils";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function RankingList({
  game,
  rows,
  destacarUser,
}: {
  game: ArenaGame;
  rows: RankingRow[];
  destacarUser?: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
        Ninguém pontuou nesse período ainda. Seja o primeiro!
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/70 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      {rows.map((r) => {
        const eu = destacarUser && r.user_id === destacarUser;
        return (
          <li
            key={r.user_id}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5",
              eu && "bg-violet-500/10"
            )}
          >
            <span className="w-7 shrink-0 text-center text-sm font-bold text-zinc-400">
              {MEDAL[r.posicao] ?? r.posicao}
            </span>
            <Link
              href={`/u/${r.user_id}`}
              className="flex min-w-0 flex-1 items-center gap-2.5"
            >
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-orange-500 text-xs font-bold text-white">
                {(r.nome ?? "?").charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-sm font-medium text-zinc-100 hover:underline">
                {r.nome ?? "Jogador"}
                {eu && <span className="ml-1 text-violet-300">(você)</span>}
              </span>
            </Link>
            <span className="shrink-0 text-sm font-bold text-orange-400">
              {formatScore(game, r.best)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
