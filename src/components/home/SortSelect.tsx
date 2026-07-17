"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronDown } from "lucide-react";

const OPCOES = [
  { v: "recentes", label: "Mais recentes" },
  { v: "preco_asc", label: "Menor preço" },
  { v: "preco_desc", label: "Maior preço" },
] as const;

// Ordenação da grade — atualiza o parâmetro ?ordem preservando busca/categoria.
export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const atual = params.get("ordem") || "recentes";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = new URLSearchParams(params.toString());
    if (e.target.value === "recentes") p.delete("ordem");
    else p.set("ordem", e.target.value);
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="relative inline-flex items-center">
      <ArrowUpDown className="pointer-events-none absolute left-3 size-4 text-zinc-500" />
      <select
        value={atual}
        onChange={onChange}
        aria-label="Ordenar por"
        className="h-10 appearance-none rounded-lg border border-white/10 bg-white/5 pr-8 pl-9 text-sm font-medium text-zinc-200 focus:ring-1 focus:ring-violet-500/40 focus:outline-none"
      >
        {OPCOES.map((o) => (
          <option key={o.v} value={o.v} className="bg-neutral-900">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-zinc-500" />
    </div>
  );
}
