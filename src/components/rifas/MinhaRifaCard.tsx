import Link from "next/link";
import Image from "next/image";
import { Pencil, Settings2, Trophy } from "lucide-react";

import { formatBRL } from "@/lib/format";
import { RIFA_STATUS_LABEL } from "@/types/rifa";
import type { MinhaRifa } from "@/actions/rifas";

const STATUS_COR: Record<string, string> = {
  aberta: "bg-emerald-500/15 text-emerald-300",
  encerrada: "bg-amber-500/15 text-amber-300",
  finalizada: "bg-blue-500/15 text-blue-300",
};

export function MinhaRifaCard({ rifa }: { rifa: MinhaRifa }) {
  const pct = Math.min(
    100,
    Math.round((rifa.pagos / rifa.total_numeros) * 100) || 0
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900">
      <div className="flex gap-4 p-4">
        {/* Capa */}
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
          {rifa.image_url ? (
            <Image
              src={rifa.image_url}
              alt={rifa.titulo}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-zinc-700">
              <Trophy className="size-6" />
            </div>
          )}
        </div>

        {/* Título + status */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-zinc-100">
              {rifa.titulo}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                STATUS_COR[rifa.status] ?? "bg-zinc-800 text-zinc-300"
              }`}
            >
              {RIFA_STATUS_LABEL[rifa.status]}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-400">
            🎁 {rifa.premio}
          </p>

          {/* Progresso de cotas pagas */}
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              {rifa.pagos}/{rifa.total_numeros} cotas pagas
            </span>
            {rifa.reservados > 0 && (
              <span className="text-amber-400/80">
                {rifa.reservados} reservadas
              </span>
            )}
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Faturamento */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/10 bg-neutral-950/40 text-center">
        <Metrica label="Arrecadado" valor={formatBRL(rifa.arrecadado)} />
        <Metrica
          label="Sua parte"
          valor={formatBRL(rifa.liquido)}
          cor="text-emerald-400"
        />
        <Metrica
          label={`Taxa Cloud (${rifa.percentual}%)`}
          valor={formatBRL(rifa.taxa)}
          cor="text-zinc-400"
        />
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 border-t border-white/10 p-3">
        <Link
          href={`/rifas/${rifa.id}`}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-neutral-800 text-sm font-semibold text-blue-300 ring-1 ring-white/10 transition-colors hover:bg-neutral-700"
        >
          <Settings2 className="size-4" /> Gerenciar
        </Link>
        <Link
          href={`/rifas/${rifa.id}/editar`}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 text-zinc-300 transition-colors hover:bg-neutral-800"
          aria-label="Editar rifa"
        >
          <Pencil className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function Metrica({
  label,
  valor,
  cor = "text-zinc-100",
}: {
  label: string;
  valor: string;
  cor?: string;
}) {
  return (
    <div className="px-2 py-3">
      <p className={`text-sm font-bold ${cor}`}>{valor}</p>
      <p className="mt-0.5 text-[10px] tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}
