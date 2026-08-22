import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Mercado } from "@/lib/precos";

// Comparação de preços entre os principais mercados (o mais barato em verde).
const CURADOS = ["buff", "csfloat", "skinport", "steam", "dmarket", "waxpeer"];

export function MercadosComparacao({ mercados }: { mercados: Mercado[] }) {
  const lista = mercados
    .filter((m) => CURADOS.includes(m.source))
    .sort((a, b) => a.price - b.price);
  if (lista.length < 2) return null;

  const min = lista[0].price;

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-neutral-950 p-3">
      <p className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
        Preços no mercado
      </p>
      <ul className="space-y-1.5 text-sm">
        {lista.map((m) => (
          <li key={m.source} className="flex items-center justify-between gap-3">
            <span className="text-zinc-300">{m.nome}</span>
            <span
              className={cn(
                "font-semibold",
                m.price === min ? "text-emerald-400" : "text-zinc-100"
              )}
            >
              {formatBRL(m.price)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
