"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { WEAPON_IMG } from "@/lib/cs2-weapons";

// Categorias + modelos de arma de CS2 (clicar num modelo filtra por nome).
// `categoria` filtra pelo tipo; `q` filtra por termo (agentes/adesivos).
type Cat = { label: string; categoria?: string; q?: string; itens: string[] };

const CATS: Cat[] = [
  {
    label: "Facas",
    categoria: "Faca",
    itens: ["Bayonet", "Bowie Knife", "Butterfly Knife", "Classic Knife", "Falchion Knife", "Flip Knife", "Gut Knife", "Huntsman Knife", "Karambit", "Kukri Knife", "M9 Bayonet", "Navaja Knife", "Nomad Knife", "Paracord Knife", "Shadow Daggers", "Skeleton Knife", "Stiletto Knife", "Survival Knife", "Talon Knife", "Ursus Knife"],
  },
  {
    label: "Luvas",
    categoria: "Luva",
    itens: ["Bloodhound Gloves", "Broken Fang Gloves", "Driver Gloves", "Hand Wraps", "Hydra Gloves", "Moto Gloves", "Specialist Gloves", "Sport Gloves"],
  },
  {
    label: "Rifles",
    categoria: "Rifle",
    itens: ["AK-47", "AUG", "FAMAS", "Galil AR", "M4A1-S", "M4A4", "SG 553", "AWP", "SSG 08", "G3SG1", "SCAR-20"],
  },
  {
    label: "Pistolas",
    categoria: "Pistola",
    itens: ["CZ75-Auto", "Desert Eagle", "Dual Berettas", "Five-SeveN", "Glock-18", "P2000", "P250", "R8 Revolver", "Tec-9", "USP-S"],
  },
  {
    label: "SMG",
    categoria: "SMG",
    itens: ["MAC-10", "MP5-SD", "MP7", "MP9", "P90", "PP-Bizon", "UMP-45"],
  },
  {
    label: "Pesadas",
    categoria: "Outro",
    itens: ["MAG-7", "Nova", "Sawed-Off", "XM1014", "M249", "Negev"],
  },
  { label: "Agentes", q: "Agent", itens: [] },
  { label: "Adesivos", q: "Sticker", itens: [] },
  { label: "Diversos", categoria: "Outro", itens: ["Zeus x27", "Music Kit", "Graffiti", "Pin", "Patch"] },
];

export function TopCategoryNav() {
  const params = useSearchParams();
  const catAtiva = params.get("categoria");
  const [aberto, setAberto] = useState<string | null>(null);

  const atual = CATS.find((c) => c.label === aberto);
  const hideScroll = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900">
      {/* Categorias */}
      <div className={cn("flex items-center gap-0.5 overflow-x-auto px-1.5", hideScroll)}>
        {CATS.map((c) => {
          const aberta = aberto === c.label;
          const ativa = aberta || catAtiva === c.categoria;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => setAberto(aberta ? null : c.label)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-lg px-3.5 py-3 text-sm font-semibold transition-colors",
                ativa ? "text-white" : "text-zinc-400 hover:text-white"
              )}
            >
              {c.label}
              <ChevronDown className={cn("size-3.5 transition-transform", aberta && "rotate-180")} />
            </button>
          );
        })}
      </div>

      {/* Modelos da categoria aberta */}
      {atual && (
        <div className="border-t border-white/10 p-3">
          <div className={cn("flex gap-2 overflow-x-auto pb-1", hideScroll)}>
            <Link
              href={
                atual.categoria
                  ? `/?categoria=${encodeURIComponent(atual.categoria)}`
                  : `/?q=${encodeURIComponent(atual.q ?? "")}`
              }
              onClick={() => setAberto(null)}
              className="grid min-w-[6rem] shrink-0 place-items-center rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-4 text-center text-xs font-semibold text-violet-200"
            >
              Ver {atual.label.toLowerCase()}
            </Link>
            {atual.itens.map((w) => (
              <Link
                key={w}
                href={`/?q=${encodeURIComponent(w)}`}
                onClick={() => setAberto(null)}
                className="flex w-28 shrink-0 flex-col items-center gap-1 rounded-lg border border-white/10 bg-neutral-950 px-2 py-3 transition-colors hover:border-white/25"
              >
                <span className="text-center text-xs font-semibold text-zinc-200">
                  {w}
                </span>
                {WEAPON_IMG[w] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={WEAPON_IMG[w]}
                    alt=""
                    loading="lazy"
                    className="h-12 w-full object-contain"
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
