"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { excluirRifa } from "@/actions/rifas";
import { RIFA_STATUS_LABEL, type Rifa } from "@/types/rifa";

export function AdminRifaRow({ rifa }: { rifa: Rifa }) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [busy, setBusy] = useState(false);

  async function excluir() {
    setBusy(true);
    const res = await excluirRifa(rifa.id);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Rifa excluída.");
    router.refresh();
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="min-w-0 flex-1">
        <Link href={`/rifas/${rifa.id}`} className="truncate text-sm font-semibold text-zinc-100 hover:underline">
          {rifa.titulo}
        </Link>
        <p className="text-xs text-zinc-500">
          {RIFA_STATUS_LABEL[rifa.status]} · {rifa.vendidos}/{rifa.total_numeros} cotas
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {confirmar ? (
          <>
            <button
              type="button"
              onClick={excluir}
              disabled={busy}
              className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "..." : "Excluir"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
            >
              Não
            </button>
          </>
        ) : (
          <>
            <Link
              href={`/rifas/${rifa.id}/editar`}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              <Pencil className="size-3" /> Editar
            </Link>
            <button
              type="button"
              onClick={() => setConfirmar(true)}
              aria-label="Excluir rifa"
              className="grid size-7 place-items-center rounded-lg border border-zinc-700 text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
