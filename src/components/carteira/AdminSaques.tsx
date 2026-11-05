"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Loader2, X } from "lucide-react";

import { processarSaque, type SaqueAdmin } from "@/actions/carteira";
import { formatBRL } from "@/lib/format";

// Admin: pedidos de saque. "Paguei" depois de enviar o Pix; "Recusar" devolve
// o valor para a carteira do usuário (estorno no extrato).
export function AdminSaques({ saques }: { saques: SaqueAdmin[] }) {
  if (saques.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
        Nenhum saque aguardando.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {saques.map((s) => (
        <SaqueRow key={s.id} saque={s} />
      ))}
    </ul>
  );
}

function SaqueRow({ saque: s }: { saque: SaqueAdmin }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"aprovar" | "recusar" | null>(null);

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
            {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(
              new Date(s.created_at),
            )}
          </p>
        </div>
        <p className="text-lg font-bold text-emerald-400">{formatBRL(s.valor)}</p>
      </div>
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
      </div>
    </li>
  );
}
