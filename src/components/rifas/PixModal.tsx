"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Loader2, X } from "lucide-react";

import { cancelarMeuPagamento, statusPagamento } from "@/actions/rifas";
import { formatBRL } from "@/lib/format";
import type { PixPagamento } from "@/actions/rifas";

export function PixModal({ pix, onClose }: { pix: PixPagamento; onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<"pendente" | "pago" | "cancelado">("pendente");
  const [copiado, setCopiado] = useState(false);

  // Polling do status do pagamento.
  useEffect(() => {
    if (status !== "pendente") return;
    const t = setInterval(async () => {
      const s = await statusPagamento(pix.pagamentoId);
      if (s === "pago") {
        setStatus("pago");
        toast.success("Pagamento confirmado! Cotas garantidas. 🎉");
        router.refresh();
      } else if (s === "cancelado") {
        setStatus("cancelado");
      }
    }, 3500);
    return () => clearInterval(t);
  }, [status, pix.pagamentoId, router]);

  async function copiar() {
    await navigator.clipboard.writeText(pix.copiaCola);
    setCopiado(true);
    toast.success("Código Pix copiado!");
    setTimeout(() => setCopiado(false), 2000);
  }

  async function fechar() {
    if (status === "pendente") {
      await cancelarMeuPagamento(pix.pagamentoId);
      router.refresh();
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={fechar}>
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-100">Pagamento via Pix</h2>
          <button type="button" onClick={fechar} aria-label="Fechar" className="text-zinc-400 hover:text-zinc-200">
            <X className="size-5" />
          </button>
        </div>

        {status === "pago" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="size-8" />
            </span>
            <p className="text-lg font-bold text-zinc-100">Pagamento confirmado!</p>
            <p className="text-sm text-zinc-400">
              Suas cotas ({pix.numeros.sort((a, b) => a - b).join(", ")}) estão garantidas.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 inline-flex h-10 items-center rounded-lg bg-gradient-to-r from-violet-600 to-orange-500 px-5 text-sm font-semibold text-white"
            >
              Concluir
            </button>
          </div>
        ) : status === "cancelado" ? (
          <div className="py-6 text-center">
            <p className="text-sm text-zinc-300">Pagamento cancelado ou expirado.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex h-10 items-center rounded-lg border border-zinc-700 px-4 text-sm text-zinc-200"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-zinc-400">
              {pix.numeros.length} cota(s) ·{" "}
              <span className="font-bold text-orange-400">{formatBRL(pix.valor)}</span>
            </p>

            {pix.qrBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pix.qrBase64}`}
                alt="QR Code Pix"
                className="mx-auto mt-3 size-56 rounded-lg bg-white p-2"
              />
            )}

            <button
              type="button"
              onClick={copiar}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-orange-500 py-3 text-sm font-semibold text-white"
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? "Copiado!" : "Copiar código Pix"}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
              <Loader2 className="size-3.5 animate-spin" /> Aguardando pagamento…
              confirma automaticamente.
            </p>
            <p className="mt-1 text-center text-[11px] text-zinc-600">
              Abra o app do seu banco, escolha Pix → Copia e Cola.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
