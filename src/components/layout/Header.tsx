import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { NavLinks } from "@/components/layout/NavLinks";
import { AccountButton } from "@/components/layout/AccountButton";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const user = await getUser();
  const nome =
    (user?.user_metadata?.nome as string | undefined) ??
    user?.email?.split("@")[0] ??
    null;

  // Avatar (foto da Steam ou enviada) pra mostrar no botão de conta.
  let avatar: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle<{ avatar_url: string | null }>();
    avatar = data?.avatar_url ?? null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/85 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4">
        <Logo className="shrink-0" />
        <NavLinks />

        {/* Busca — ocupa o espaço central */}
        <form action="/" className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            name="q"
            placeholder="Buscar skins..."
            aria-label="Buscar skins"
            className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pr-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500/60 focus:bg-white/[0.07] focus:ring-1 focus:ring-violet-500/40 focus:outline-none"
          />
        </form>

        {/* Ações à direita */}
        <Link
          href="/novo"
          className="hidden h-10 shrink-0 items-center gap-1.5 rounded-lg bg-neutral-800 ring-1 ring-white/10 px-4 text-sm font-semibold text-violet-300 transition-colors hover:bg-neutral-700 sm:inline-flex"
        >
          <Plus className="size-4" />
          Vender
        </Link>
        <AccountButton nome={nome} avatar={avatar} />
      </div>
    </header>
  );
}
