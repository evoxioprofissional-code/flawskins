import Image from "next/image";
import Link from "next/link";
import { Ticket, Trophy } from "lucide-react";

import { formatBRL } from "@/lib/format";
import { RIFA_STATUS_LABEL, type Rifa } from "@/types/rifa";
import { cn } from "@/lib/utils";

export function RifaCard({ rifa }: { rifa: Rifa }) {
  const pct = Math.min(100, Math.round((rifa.vendidos / rifa.total_numeros) * 100));
  return (
    <Link
      href={`/rifas/${rifa.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition-all hover:border-violet-500/50 hover:shadow-[0_0_24px_-8px] hover:shadow-violet-500/40"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
        {rifa.image_url ? (
          <Image
            src={rifa.image_url}
            alt={rifa.titulo}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-zinc-700">
            <Trophy className="size-10" />
          </div>
        )}
        <span
          className={cn(
            "absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            rifa.status === "aberta"
              ? "bg-emerald-500/90 text-white"
              : rifa.status === "finalizada"
                ? "bg-violet-500/90 text-white"
                : "bg-zinc-700 text-zinc-200"
          )}
        >
          {RIFA_STATUS_LABEL[rifa.status]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-1 text-sm font-bold text-zinc-100">{rifa.titulo}</p>
        <p className="line-clamp-1 text-xs text-zinc-400">🎁 {rifa.premio}</p>

        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{rifa.vendidos}/{rifa.total_numeros} cotas</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-orange-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-sm font-bold text-orange-400">
          <Ticket className="size-4" />
          {formatBRL(rifa.preco_cota)}{" "}
          <span className="text-xs font-normal text-zinc-500">/ cota</span>
        </div>
      </div>
    </Link>
  );
}
