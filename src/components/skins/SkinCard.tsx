import Link from "next/link";

import type { Anuncio, Categoria, Exterior } from "@/types/database";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SkinImage } from "@/components/skins/SkinImage";
import { WearBar } from "@/components/skins/WearBar";

// Faixa de "raridade" no topo do card (usamos a categoria como proxy).
const STRIP: Record<Categoria, string> = {
  Faca: "bg-amber-400",
  Luva: "bg-amber-400",
  Rifle: "bg-rose-500",
  Sniper: "bg-violet-500",
  Pistola: "bg-sky-500",
  SMG: "bg-emerald-500",
  Outro: "bg-zinc-500",
};

const EXT_ABBR: Record<Exterior, string> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
};

// "AK-47 | Redline (Field-Tested)" → { arma: "AK-47", nome: "Redline" }
function parseTitulo(titulo: string): { arma: string; nome: string } {
  const partes = titulo.split("|");
  if (partes.length < 2) return { arma: "", nome: titulo.trim() };
  const arma = partes[0].trim();
  const nome = partes.slice(1).join("|").replace(/\s*\([^)]*\)\s*$/, "").trim();
  return { arma, nome };
}

export function SkinCard({ anuncio }: { anuncio: Anuncio }) {
  const vendido = anuncio.status === "vendido";
  const { arma, nome } = parseTitulo(anuncio.titulo);
  const float = anuncio.float_val;

  return (
    <Link
      href={`/skin/${anuncio.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-900 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-white/25 hover:shadow-xl hover:shadow-black/40"
      )}
    >
      {/* Faixa de raridade */}
      <div className={cn("h-1 w-full", STRIP[anuncio.categoria])} />

      {/* Imagem */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950">
        <SkinImage
          src={anuncio.image_url}
          alt={anuncio.titulo}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 18vw"
          imgClassName="transition-transform duration-300 group-hover:scale-[1.06]"
        />
        <span className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-zinc-300 uppercase backdrop-blur">
          {anuncio.categoria}
        </span>
        {vendido && (
          <div className="absolute inset-0 grid place-items-center bg-neutral-950/75">
            <span className="rounded-md border border-zinc-500 px-2.5 py-1 text-xs font-bold tracking-widest text-zinc-100">
              VENDIDO
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div className="min-h-[2.5rem]">
          {arma && (
            <p className="truncate text-[11px] font-medium text-zinc-500">{arma}</p>
          )}
          <h3 className="line-clamp-1 text-sm font-semibold text-zinc-100">{nome}</h3>
        </div>

        {/* Float / desgaste */}
        {float != null && (
          <div className="flex items-center gap-2">
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
              {EXT_ABBR[anuncio.exterior]}
            </span>
            <WearBar float={Number(float)} compact className="flex-1" />
            <span className="font-mono text-[10px] text-zinc-400">
              {Number(float).toFixed(4)}
            </span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
          <span className="font-display text-lg font-bold text-fuchsia-400">
            {formatBRL(anuncio.preco)}
          </span>
          {float == null && (
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
              {anuncio.exterior}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
