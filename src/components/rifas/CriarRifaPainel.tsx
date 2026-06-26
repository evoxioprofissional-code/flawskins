"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Loader2, Ticket, Wallet } from "lucide-react";

import { iniciarTaxa } from "@/actions/rifas";
import { PixModal } from "@/components/rifas/PixModal";
import { RifaForm } from "@/components/rifas/RifaForm";
import { formatBRL } from "@/lib/format";
import type { PixPagamento } from "@/actions/rifas";

export function CriarRifaPainel({
  conectado,
  creditos,
  taxa,
}: {
  conectado: boolean;
  creditos: number;
  taxa: number;
}) {
  const router = useRouter();
  const [pix, setPix] = useState<PixPagamento | null>(null);
  const [busy, setBusy] = useState(false);

  async function pagarTaxa() {
    setBusy(true);
    const res = await iniciarTaxa();
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setPix(res.data);
  }

  // Passo 1: conectar Mercado Pago.
  if (!conectado) {
    return (
      <Passo
        n={1}
        titulo="Conecte sua conta Mercado Pago"
        texto="O dinheiro das cotas da sua rifa cai direto na sua conta. Conecte uma vez e pronto."
      >
        <a
          href="/api/mp/oauth/connect"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#009ee3] px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Wallet className="size-4" /> Conectar Mercado Pago
        </a>
      </Passo>
    );
  }

  // Passo 2: pagar a taxa (vira crédito).
  if (creditos < 1) {
    return (
      <>
        <Passo
          n={2}
          titulo={`Pague a taxa de ${formatBRL(taxa)}`}
          texto="Uma taxa única por rifa, paga via Pix. Assim que cair, o formulário da rifa é liberado."
        >
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
            <BadgeCheck className="size-4" /> Mercado Pago conectado
          </div>
          <button
            type="button"
            onClick={pagarTaxa}
            disabled={busy}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />}
            Pagar taxa e liberar criação
          </button>
        </Passo>
        {pix && (
          <PixModal
            pix={pix}
            onClose={() => {
              setPix(null);
              router.refresh();
            }}
          />
        )}
      </>
    );
  }

  // Passo 3: formulário liberado.
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
        <BadgeCheck className="size-4" /> Taxa paga — você tem {creditos} criação
        {creditos > 1 ? "ões" : ""} liberada{creditos > 1 ? "s" : ""}. Preencha sua rifa:
      </div>
      <RifaForm usuario />
    </div>
  );
}

function Passo({
  n,
  titulo,
  texto,
  children,
}: {
  n: number;
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <span className="mb-3 inline-grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
        {n}
      </span>
      <h2 className="text-lg font-bold text-zinc-100">{titulo}</h2>
      <p className="mt-1 mb-4 max-w-md text-sm text-zinc-400">{texto}</p>
      {children}
    </div>
  );
}
