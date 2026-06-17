import Link from "next/link";
import { Plus, Search, SlidersHorizontal, Swords, Ticket } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { AccountButton } from "@/components/layout/AccountButton";
import { getUser } from "@/lib/auth";

export async function Header() {
  const user = await getUser();
  const nome =
    (user?.user_metadata?.nome as string | undefined) ??
    user?.email?.split("@")[0] ??
    null;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="mx-auto w-full max-w-6xl px-4">
        {/* Linha 1: logo + ações */}
        <div className="flex h-14 items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              href="/rifas"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 text-sm font-semibold text-orange-200 transition-colors hover:bg-orange-500/20"
            >
              <Ticket className="size-4" />
              <span className="hidden sm:inline">Rifas</span>
            </Link>
            <Link
              href="/arena"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/20"
            >
              <Swords className="size-4" />
              <span className="hidden sm:inline">Arena</span>
            </Link>
            <AccountButton nome={nome} />
          </div>
        </div>

        {/* Linha 2: busca + filtros + vender */}
        <div className="flex items-center gap-2 pb-3">
          <form action="/" className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              name="q"
              placeholder="Buscar skins..."
              aria-label="Buscar skins"
              className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 pr-3 pl-9 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500/60 focus:outline-none"
            />
          </form>
          <Link
            href="/categorias"
            aria-label="Categorias e filtros"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            <SlidersHorizontal className="size-5" />
          </Link>
          <Link
            href="/novo"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">sell</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
