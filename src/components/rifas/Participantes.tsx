import Link from "next/link";
import { Users } from "lucide-react";

import type { Participante } from "@/actions/rifas";

export function Participantes({ lista }: { lista: Participante[] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-100">
        <Users className="size-5 text-violet-400" /> Quem comprou{" "}
        <span className="text-sm font-normal text-zinc-500">({lista.length})</span>
      </h2>
      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
          Ninguém comprou cotas ainda. Seja o primeiro!
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/70 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          {lista.map((p) => (
            <li key={p.user_id} className="flex items-center gap-3 px-3 py-2.5">
              <Link
                href={`/u/${p.user_id}`}
                className="flex min-w-0 flex-1 items-center gap-2.5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-orange-500 text-xs font-bold text-white">
                  {(p.nome ?? "?").charAt(0).toUpperCase()}
                </span>
                <span className="truncate text-sm font-medium text-zinc-100 hover:underline">
                  {p.nome ?? "Jogador"}
                </span>
              </Link>
              <div className="flex max-w-[55%] flex-wrap justify-end gap-1">
                {p.numeros.slice(0, 12).map((n) => (
                  <span
                    key={n}
                    className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-200"
                  >
                    {n}
                  </span>
                ))}
                {p.numeros.length > 12 && (
                  <span className="px-1 text-[11px] text-zinc-500">
                    +{p.numeros.length - 12}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
