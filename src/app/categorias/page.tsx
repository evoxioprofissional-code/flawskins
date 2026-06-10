import Link from "next/link";
import type { Metadata } from "next";
import {
  Crosshair,
  Hand,
  Swords,
  Target,
  Crown,
  Zap,
  Boxes,
  type LucideIcon,
} from "lucide-react";

import { CATEGORIAS, type Categoria } from "@/types/database";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Categorias — FlawSkins" };

const ICONS: Record<Categoria, LucideIcon> = {
  Faca: Swords,
  Luva: Hand,
  Rifle: Crosshair,
  Pistola: Target,
  SMG: Zap,
  Sniper: Crown,
  Outro: Boxes,
};

export default function CategoriasPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackButton className="mb-4" />
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Categorias
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Escolha um tipo de skin para filtrar o feed.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIAS.map((cat) => {
          const Icon = ICONS[cat];
          return (
            <Link
              key={cat}
              href={`/?categoria=${encodeURIComponent(cat)}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-6 text-center transition-all hover:border-violet-500/50 hover:shadow-[0_0_20px_-6px] hover:shadow-violet-500/30"
            >
              <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-orange-500/20 text-violet-300 transition-colors group-hover:text-violet-200">
                <Icon className="size-6" />
              </span>
              <span className="text-sm font-semibold text-zinc-100">{cat}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
