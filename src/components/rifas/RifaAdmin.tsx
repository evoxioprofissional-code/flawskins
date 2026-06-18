"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeDollarSign, Dice5, Lock, ShieldCheck } from "lucide-react";

import {
  encerrarRifa,
  marcarTodosPagos,
  sortearVencedor,
} from "@/actions/rifas";
import type { RifaStatus } from "@/types/rifa";

export function RifaAdmin({
  rifaId,
  status,
  reservados,
  pagos,
  souAdmin = true,
}: {
  rifaId: string;
  status: RifaStatus;
  reservados: number;
  pagos: number;
  souAdmin?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return toast.error(res.error || "Erro");
    toast.success(msg);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-200">
        <ShieldCheck className="size-4" /> {souAdmin ? "Controles do admin" : "Gerenciar minha rifa"}
      </p>
      <div className="mb-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-lg bg-zinc-950 px-2 py-2">
          <p className="font-bold text-zinc-100">{reservados}</p>
          <p className="text-[11px] text-zinc-500">reservados</p>
        </div>
        <div className="rounded-lg bg-zinc-950 px-2 py-2">
          <p className="font-bold text-emerald-400">{pagos}</p>
          <p className="text-[11px] text-zinc-500">pagos</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {souAdmin && (
          <button
            type="button"
            disabled={busy || reservados === 0}
            onClick={() => run(() => marcarTodosPagos(rifaId), "Reservas marcadas como pagas.")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            <BadgeDollarSign className="size-4" /> Marcar reservados como pagos
          </button>
        )}
        {status === "aberta" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => encerrarRifa(rifaId), "Vendas encerradas.")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            <Lock className="size-4" /> Encerrar vendas
          </button>
        )}
        {status !== "finalizada" && (
          <button
            type="button"
            disabled={busy || pagos === 0}
            onClick={() =>
              run(async () => {
                const r = await sortearVencedor(rifaId);
                return r;
              }, "Vencedor sorteado!")
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-orange-500 px-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Dice5 className="size-4" /> Sortear vencedor
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        O sorteio escolhe aleatoriamente entre as cotas <b>pagas</b>.
      </p>
    </div>
  );
}
