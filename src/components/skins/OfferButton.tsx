"use client";

import { useState } from "react";
import { HandCoins } from "lucide-react";

import { buildLanceLink } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/format";

// Botão "Dar lance": comprador digita uma oferta e envia pro WhatsApp do vendedor.
export function OfferButton({
  whatsapp,
  titulo,
  preco,
}: {
  whatsapp: string;
  titulo: string;
  preco: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");

  const lance = Number(valor.replace(",", "."));
  const valido = valor !== "" && !Number.isNaN(lance) && lance > 0;

  function enviar() {
    if (!valido) return;
    const link = buildLanceLink(whatsapp, titulo, preco, lance);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/50 bg-violet-500/10 px-4 py-3.5 text-base font-semibold text-violet-200 transition-colors hover:bg-violet-500/20"
      >
        <HandCoins className="size-5" />
        Dar um lance
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-violet-500/40 bg-zinc-900 p-3">
      <label className="text-sm font-medium text-zinc-200">
        Seu lance (anunciada por {formatBRL(preco)})
      </label>
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-zinc-500">
            R$
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            placeholder="1000"
            className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 pr-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={enviar}
          disabled={!valido}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-whatsapp px-4 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          <HandCoins className="size-4" />
          Enviar lance
        </button>
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        Abre o WhatsApp do vendedor com sua oferta pré-preenchida.
      </p>
    </div>
  );
}
