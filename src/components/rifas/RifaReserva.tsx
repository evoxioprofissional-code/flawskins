"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Dice5, Ticket } from "lucide-react";

import { comprarCotas } from "@/actions/rifas";
import { PixModal } from "@/components/rifas/PixModal";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PixPagamento } from "@/actions/rifas";
import type { RifaNumero } from "@/types/rifa";

const GRID_MAX = 300;

export function RifaReserva({
  rifaId,
  total,
  preco,
  vendidos,
  aberta,
  logged,
  taken,
  meus,
}: {
  rifaId: string;
  total: number;
  preco: number;
  vendidos: number;
  aberta: boolean;
  logged: boolean;
  taken: { numero: number; user_id: string }[];
  meus: RifaNumero[];
}) {
  const [qtd, setQtd] = useState(1);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [pix, setPix] = useState<PixPagamento | null>(null);

  const restante = total - vendidos;
  const takenSet = useMemo(() => new Set(taken.map((t) => t.numero)), [taken]);
  const meusSet = useMemo(() => new Set(meus.map((m) => m.numero)), [meus]);

  function toggle(n: number) {
    setSel((s) => {
      const ns = new Set(s);
      if (ns.has(n)) ns.delete(n);
      else ns.add(n);
      return ns;
    });
  }

  async function aleatorio() {
    setBusy(true);
    const res = await comprarCotas(rifaId, { tipo: "aleatorio", qtd });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setPix(res.data);
  }

  async function reservarSelecionados() {
    if (sel.size === 0) return;
    setBusy(true);
    const res = await comprarCotas(rifaId, { tipo: "numeros", numeros: [...sel] });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setSel(new Set());
    setPix(res.data);
  }

  if (!aberta) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-center text-sm text-zinc-400">
        As vendas desta rifa estão encerradas.
      </div>
    );
  }

  if (!logged) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
        <p className="text-sm text-zinc-400">Entre para comprar cotas.</p>
        <Link
          href={`/login?next=/rifas/${rifaId}`}
          className="mt-3 inline-flex h-10 items-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-sm font-semibold text-white"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seus números */}
      {meus.length > 0 && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
          <p className="mb-1.5 text-xs font-semibold tracking-widest text-violet-300 uppercase">
            Seus números
          </p>
          <div className="flex flex-wrap gap-1.5">
            {meus.map((m) => (
              <span
                key={m.numero}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-bold tabular-nums",
                  m.status === "pago"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-zinc-800 text-zinc-200"
                )}
                title={m.status === "pago" ? "pago" : "aguardando pagamento"}
              >
                {m.numero}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reserva rápida */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm font-semibold text-zinc-100">Reserva rápida</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {restante} cota{restante === 1 ? "" : "s"} disponíve{restante === 1 ? "l" : "is"}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={Math.min(50, restante)}
            value={qtd}
            onChange={(e) =>
              setQtd(Math.max(1, Math.min(50, restante, Number(e.target.value) || 1)))
            }
            className="h-11 w-20 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-center text-sm text-zinc-100 focus:border-violet-500/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={aleatorio}
            disabled={busy || restante === 0}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Dice5 className="size-4" />
            Comprar {qtd} · {formatBRL(qtd * preco)}
          </button>
        </div>
      </div>

      {/* Grid de números (rifas pequenas) */}
      {total <= GRID_MAX ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-100">Escolher números</p>
            {sel.size > 0 && (
              <button
                type="button"
                onClick={reservarSelecionados}
                disabled={busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Ticket className="size-4" /> Comprar {sel.size} · {formatBRL(sel.size * preco)}
              </button>
            )}
          </div>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
            {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
              const isTaken = takenSet.has(n);
              const isMine = meusSet.has(n);
              const isSel = sel.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  disabled={isTaken}
                  onClick={() => toggle(n)}
                  className={cn(
                    "grid h-8 place-items-center rounded-md text-xs font-semibold tabular-nums transition-colors",
                    isMine
                      ? "bg-violet-600 text-white"
                      : isTaken
                        ? "cursor-not-allowed bg-zinc-800 text-zinc-600 line-through"
                        : isSel
                          ? "bg-fuchsia-500 text-white"
                          : "border border-zinc-800 text-zinc-300 hover:border-violet-500/50"
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-center text-xs text-zinc-500">
          Esta rifa tem muitos números — use a reserva rápida acima.
        </p>
      )}

      <p className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
        💳 Pagamento por <b>Pix</b> (Mercado Pago). As cotas são confirmadas
        automaticamente assim que o pagamento cair. Se não pagar, elas voltam a
        ficar livres.
      </p>

      {pix && <PixModal pix={pix} onClose={() => setPix(null)} />}
    </div>
  );
}
