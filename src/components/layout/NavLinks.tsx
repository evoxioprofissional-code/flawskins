"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BriefcaseBusiness, Gift, LayoutGrid, Tag, Trophy, UsersRound } from "lucide-react";
import { WHATSAPP_COMUNIDADE } from "@/lib/whatsapp";

const LINKS = [
  { href: "/", label: "Market", Icon: LayoutGrid },
  { href: "/novo", label: "Vender", Icon: Tag },
  { href: "/perfil#inventario", label: "Inventário", Icon: BriefcaseBusiness },
  { href: "/rifas", label: "Rifas", Icon: Gift },
  { href: "/esports", label: "E-Sports", Icon: Trophy },
  { href: WHATSAPP_COMUNIDADE, label: "Comunidade", Icon: UsersRound },
];

// Links de navegação do header (desktop), com destaque da rota ativa.
export function NavLinks() {
  const path = usePathname();

  return (
    <nav className="site-header-nav">
      {LINKS.map((l) => {
        const route = l.href.split("#")[0];
        const active = path === route || (route !== "/" && path.startsWith(`${route}/`));
        return (
          <Link
            key={l.href}
            href={l.href}
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            <l.Icon aria-hidden="true" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
