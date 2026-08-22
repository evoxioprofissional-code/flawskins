import { formatBRL } from "@/lib/format";
import type { PrecoRef } from "@/lib/precos";

// Mostra o preço de referência do Buff163 e um selo comparando com o preço
// do vendedor (abaixo = bom negócio, acima = caro).
export function PrecoBuff({ preco, ref }: { preco: number; ref: PrecoRef }) {
  if (!ref?.buff) return null;

  const diff = ((preco - ref.buff) / ref.buff) * 100;
  const abaixo = diff <= -2;
  const acima = diff >= 2;

  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm">
      <span className="text-zinc-400">
        Buff163:{" "}
        <span className="font-semibold text-zinc-100">{formatBRL(ref.buff)}</span>
      </span>
      <span
        className={
          "ml-auto rounded-md px-2 py-0.5 text-xs font-bold " +
          (abaixo
            ? "bg-emerald-500/15 text-emerald-300"
            : acima
              ? "bg-red-500/15 text-red-300"
              : "bg-white/5 text-zinc-300")
        }
      >
        {diff > 0 ? "+" : ""}
        {diff.toFixed(0)}% vs Buff
      </span>
    </div>
  );
}
