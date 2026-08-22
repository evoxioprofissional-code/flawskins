"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Comprar" },
  { href: "/rifas", label: "Rifas" },
];

// Links de navegação do header (desktop), com destaque da rota ativa.
export function NavLinks() {
  const path = usePathname();

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-white/[0.06] text-white ring-1 ring-white/10"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
