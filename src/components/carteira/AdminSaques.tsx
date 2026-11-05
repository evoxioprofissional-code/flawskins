"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, Copy, Loader2, RefreshCw, X } from "lucide-react";

import { processarSaque, reconciliarSaquesAdmin, type SaqueAdmin } from "@/actions/carteira";
import { formatBRL } from "@/lib/format";
import { PIX_KEY_LABEL } from "@/lib/nexuspag/saques";

const STATUS: Record<SaqueAdmin["status"], [string, string]> = {
  pending: ["Na fila", "bg-zinc-800 text-zinc-200"],
  processing: ["Processando", "bg-sky-500/15 text-sky-300"],
  completed: ["Pago", "bg-emerald-500/15 text-emerald-300"],
  failed: ["Não realizado", "bg-red-500/15 text-red-300"],
};

// Admin: saques na fila (modo manual), em processamento na NexusPag e os
// marcados para revisão. "Reconciliar" consulta o histórico da NexusPag — nunca reenvia.
export function AdminSaques({ saques }: { saques: SaqueAdmin[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reconciliar() {
    setBusy(true);
    const res = await reconciliarSaquesAdmin();
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    const r = res.data;
    toast.success(`Reconciliação: ${r.verificados} verificado(s), ${r.concluidos} pago(s), ${r.falhos} não realizado(s), ${r.revisao} para revisão.`);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={reconciliar}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Reconciliar com a NexusPag
        </button>
      </div>
      {saques.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          Nenhum saque aguardando.
        </p>
      ) : (
        <ul className="space-y-2">
          {saques.map((s) => (
            <SaqueRow key={s.id} saque={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SaqueRow({ saque: s }: { saque: SaqueAdmin }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"aprovar" | "recusar" | null>(null);
  const manual = s.status === "pending" && !s.provider_withdrawal_id;
  const [rotulo, cor] = STATUS[s.status];

  async function copiar() {
    try {
      await navigator.clipboard.writeText(s.chave_pix);
      toast.success("Chave Pix copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function processar(aprovar: boolean) {
    let motivo = "";
    if (aprovar) {
      if (!confirm(`Confirmar que ${formatBRL(s.valor)} foi enviado por Pix para ${s.chave_pix}?`)) return;
    } else {
      const m = prompt("Motivo da recusa (o usuário verá):", "");
      if (m === null) return;
      motivo = m;
    }
    setBusy(aprovar ? "aprovar" : "recusar");
    const res = await processarSaque(s.id, aprovar, motivo);
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(aprovar ? "Saque marcado como pago." : "Saque recusado e valor devolvido.");
    router.refresh();
  }

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100">{s.nome ?? "Usuário"}</p>
          <p className="text-xs text-zinc-500">
            {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(s.created_at))}
            {s.pix_key_type ? ` · ${PIX_KEY_LABEL[s.pix_key_type]}` : ""}
            {s.provider_withdrawal_id ? ` · NexusPag ${s.provider_withdrawal_id.slice(0, 8)}…` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${cor}`}>{rotulo}</span>
          <p className="text-lg font-bold text-emerald-400">{formatBRL(s.valor)}</p>
        </div>
      </div>
      {s.precisa_revisao && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Revisão: {s.motivo ?? "conferir este saque."}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copiar}
          className="inline-flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          title="Copiar chave Pix"
        >
          <Copy className="size-4 shrink-0 text-zinc-400" />
          <span className="truncate">{s.chave_pix}</span>
        </button>
        {manual && (
          <>
            <button
              type="button"
              onClick={() => processar(true)}
              disabled={busy !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {busy === "aprovar" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Paguei
            </button>
            <button
              type="button"
              onClick={() => processar(false)}
              disabled={busy !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
            >
              {busy === "recusar" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              Recusar
            </button>
          </>
        )}
      </div>
    </li>
  );
}
