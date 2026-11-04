import { Logo } from "@/components/layout/Logo";
import { HeaderSearch } from "./HeaderSearch";

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
    <header className="site-header sticky top-0 z-40">
      <div className="site-header-row">
        <Logo className="site-header-brand" />
        <NavLinks />

        <HeaderSearch />
        <AccountButton nome={nome} avatar={avatar} />
      </div>
    </header>
  );
}
