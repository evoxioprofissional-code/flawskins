import Link from "next/link";
import { Wallet } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { HeaderSearch } from "./HeaderSearch";

import { NavLinks } from "@/components/layout/NavLinks";
import { AccountButton } from "@/components/layout/AccountButton";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resumoCarteira } from "@/actions/carteira";
import { formatBRL } from "@/lib/format";

export async function Header() {
  const user = await getUser();
  const nome =
    (user?.user_metadata?.nome as string | undefined) ??
    user?.email?.split("@")[0] ??
    null;

  // Avatar (foto da Steam ou enviada) pra mostrar no botão de conta.
  let avatar: string | null = null;
  let saldo: number | null = null;
  if (user) {
    const supabase = await createClient();
    const [{ data }, resumo] = await Promise.all([
      supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle<{ avatar_url: string | null }>(),
      resumoCarteira(),
    ]);
    avatar = data?.avatar_url ?? null;
    saldo = resumo?.saldo ?? null;
  }

  return (
    <header className="site-header sticky top-0 z-40">
      <div className="site-header-row">
        <Logo className="site-header-brand" mascot />
        <NavLinks />

        <HeaderSearch />
        {saldo !== null && (
          <Link href="/carteira" className="site-header-wallet" aria-label={`Carteira: saldo de ${formatBRL(saldo)}`}>
            <Wallet aria-hidden="true" />
            <span>{formatBRL(saldo)}</span>
          </Link>
        )}
        <AccountButton nome={nome} avatar={avatar} />
      </div>
    </header>
  );
}
