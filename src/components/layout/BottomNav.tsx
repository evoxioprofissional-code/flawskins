"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutGrid, List, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
};

const items: Item[] = [
  { href: "/", label: "Feed", icon: LayoutGrid },
  { href: "/categorias", label: "Categorias", icon: List },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2">
        <NavLink item={items[0]} active={isActive(items[0].href)} />
        <NavLink item={items[1]} active={isActive(items[1].href)} />

        {/* FAB central — leva a /novo */}
        <div className="flex justify-center">
          <Link
            href="/novo"
            aria-label="Criar anúncio"
            className="-mt-6 grid size-14 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-orange-500 text-white shadow-[0_0_22px_-4px] shadow-violet-500/60 ring-4 ring-zinc-950"
          >
            <Plus className="size-6" />
          </Link>
        </div>

        <NavLink item={items[2]} active={isActive(items[2].href)} />
        <NavLink item={items[3]} active={isActive(items[3].href)} />
      </div>
    </nav>
  );
}

function NavLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
        active ? "text-violet-400" : "text-zinc-400 hover:text-zinc-200"
      )}
    >
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}
