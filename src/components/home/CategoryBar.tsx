import Link from "next/link";

import { CATEGORIAS } from "@/types/database";
import { cn } from "@/lib/utils";

// Chips de categoria: navegação rápida e visível (em vez de escondida no ícone).
export function CategoryBar({ ativa }: { ativa?: string }) {
  const itens = [{ label: "Todas", value: "" }, ...CATEGORIAS.map((c) => ({ label: c, value: c }))];

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {itens.map((it) => {
        const isActive = (ativa ?? "") === it.value;
        const href = it.value ? `/?categoria=${encodeURIComponent(it.value)}` : "/";
        return (
          <Link
            key={it.label}
            href={href}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "border-transparent bg-neutral-800 ring-1 ring-white/10 hover:bg-neutral-700 text-blue-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
