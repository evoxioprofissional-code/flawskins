"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Loader2, Wallet } from "lucide-react";

import { marcarRepassePago, type Repasse } from "@/actions/rifas";
import { formatBRL } from "@/lib/format";
import { RIFA_STATUS_LABEL } from "@/types/rifa";

// Painel do admin: quanto repassar para cada criador de rifa e para qual chave Pix.
export function AdminRepasses({ repasses }: { repasses: Repasse[] }) {
  if (repasses.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
        Nenhuma rifa de usuário ainda.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {repasses.map((r) => (
        <RepasseRow key={r.rifa_id} repasse={r} />
      ))}
    </ul>
  );
}

function RepasseRow({ repasse: r }: { repasse: Repasse }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(r.chave_pix);
      toast.success("Chave Pix copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function concluir(forma: "carteira" | "pix") {
    const msg =
      forma === "carteira"
        ? `Creditar ${formatBRL(r.liquido)} na carteira de ${r.criador ?? "criador"}?`
        : `Confirmar que ${formatBRL(r.liquido)} foi enviado por Pix para ${r.chave_pix}?`;
    if (!confirm(msg)) return;
    setBusy(true);
    const res = await marcarRepassePago(r.rifa_id, forma);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(forma === "carteira" ? "Valor creditado na carteira." : "Repasse registrado.");
    router.refresh();
  }

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">{r.titulo}</p>
          <p className="text-xs text-zinc-500">
            {r.criador ?? "Criador"} · {RIFA_STATUS_LABEL[r.rifa_status]} · {r.pagos} cota(s) paga(s)
          </p>
        </div>
        <span
          className={
            "rounded-md px-2 py-0.5 text-xs font-semibold " +
            (r.status === "pago" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300")
          }
        >
          {r.status === "pago" ? "Repassado" : "Pendente"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-zinc-900 px-2 py-2">
          <p className="font-bold text-zinc-100">{formatBRL(r.arrecadado)}</p>
          <p className="text-zinc-500">Arrecadado</p>
        </div>
        <div className="rounded-lg bg-zinc-900 px-2 py-2">
          <p className="font-bold text-zinc-400">{formatBRL(r.taxa)}</p>
          <p className="text-zinc-500">Comissão</p>
        </div>
        <div className="rounded-lg bg-zinc-900 px-2 py-2">
          <p className="font-bold text-emerald-400">{formatBRL(r.liquido)}</p>
          <p className="text-zinc-500">A repassar</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copiar}
          className="inline-flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          title="Copiar chave Pix"
        >
          <Copy className="size-4 shrink-0 text-zinc-400" />
          <span className="truncate">{r.chave_pix}</span>
        </button>
        {r.status === "pendente" && (
          <>
            <button
              type="button"
              onClick={() => concluir("carteira")}
              disabled={busy || r.liquido <= 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
              Creditar na carteira
            </button>
            <button
              type="button"
              onClick={() => concluir("pix")}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
            >
              <Check className="size-4" /> Paguei por Pix
            </button>
          </>
        )}
      </div>
    </li>
  );
}
