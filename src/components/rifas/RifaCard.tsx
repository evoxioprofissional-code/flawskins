import { SkinImage } from "@/components/skins/SkinImage";
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
      className="cloud-panel group flex flex-col overflow-hidden transition-colors hover:border-blue-500/50"
    >
      <div className="relative aspect-[2/1] w-full overflow-hidden bg-zinc-950">
        {rifa.image_url ? (
          <SkinImage
            src={rifa.image_url}
            alt={rifa.titulo}
            sizes="(max-width: 600px) 100vw, (max-width: 950px) 50vw, 25vw"
            showSteamBackground={false}
          />
        ) : (
          <div className="grid h-full place-items-center text-zinc-700">
            <Trophy className="size-10" />
          </div>
        )}
        <span
          className={cn(
            "absolute top-3 left-3 rounded-md border px-2 py-0.5 text-xs font-semibold",
            rifa.status === "aberta"
              ? "border-emerald-500/30 bg-emerald-950 text-emerald-200"
              : rifa.status === "finalizada"
                ? "border-blue-500/30 bg-blue-950 text-blue-200"
                : "border-zinc-700 bg-zinc-950 text-zinc-200"
          )}
        >
          {RIFA_STATUS_LABEL[rifa.status]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-1 text-base font-bold">{rifa.titulo}</h2>
        <p className="line-clamp-1 text-sm text-zinc-400">{rifa.premio}</p>

        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{rifa.vendidos}/{rifa.total_numeros} cotas</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-cloud-blue"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-base font-bold text-zinc-100">
          <Ticket className="size-4" />
          {formatBRL(rifa.preco_cota)}{" "}
          <span className="text-xs font-normal text-zinc-500">/ cota</span>
        </div>
      </div>
    </Link>
  );
}
