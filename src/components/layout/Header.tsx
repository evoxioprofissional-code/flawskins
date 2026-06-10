import Link from "next/link";
import { Bell, Plus, Search, SlidersHorizontal, User } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="mx-auto w-full max-w-6xl px-4">
        {/* Linha 1: logo + ações */}
        <div className="flex h-14 items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notificações"
              className="rounded-full border border-zinc-800 text-zinc-300"
            >
              <Bell className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Perfil"
              className="rounded-full border border-zinc-800 text-zinc-300"
            >
              <User className="size-5" />
            </Button>
          </div>
        </div>

        {/* Linha 2: busca + filtros + vender */}
        <div className="flex items-center gap-2 pb-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
            {/* Busca é v2 — input apenas indicativo no MVP */}
            <input
              type="search"
              disabled
              placeholder="Buscar skins (em breve)"
              aria-label="Buscar skins"
              className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 pr-3 pl-9 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none disabled:cursor-not-allowed"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Filtros (em breve)"
            disabled
            className="size-10 shrink-0 rounded-lg border border-zinc-800 text-zinc-300"
          >
            <SlidersHorizontal className="size-5" />
          </Button>
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
