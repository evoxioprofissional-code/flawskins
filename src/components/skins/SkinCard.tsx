import Link from "next/link";

import type { Anuncio, Categoria } from "@/types/database";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SkinImage } from "@/components/skins/SkinImage";

// Cor de acento por categoria (dá leitura rápida do tipo, tipo raridade).
const ACENTO: Record<Categoria, string> = {
  Faca: "bg-amber-400",
  Luva: "bg-amber-400",
  Rifle: "bg-violet-400",
  Pistola: "bg-sky-400",
  SMG: "bg-emerald-400",
  Sniper: "bg-fuchsia-400",
  Outro: "bg-zinc-400",
};

export function SkinCard({ anuncio }: { anuncio: Anuncio }) {
  const vendido = anuncio.status === "vendido";

  return (
    <Link
      href={`/skin/${anuncio.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-violet-500/50 hover:shadow-[0_12px_34px_-12px] hover:shadow-violet-500/50"
      )}
    >
      {/* Imagem */}
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950">
        <SkinImage
          src={anuncio.image_url}
          alt={anuncio.titulo}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          imgClassName="transition-transform duration-300 group-hover:scale-[1.06]"
        />
        {/* Gradiente inferior — dá legibilidade mesmo em fotos poluídas */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-zinc-950/85 to-transparent" />

        {/* Categoria */}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-md bg-zinc-950/70 px-2 py-1 text-[10px] font-semibold text-zinc-200 backdrop-blur">
          <span className={cn("size-1.5 rounded-full", ACENTO[anuncio.categoria])} />
          {anuncio.categoria}
        </span>

        {/* Desgaste */}
        <span className="absolute bottom-2 left-2 rounded-md bg-zinc-950/60 px-2 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur">
          {anuncio.exterior}
        </span>

        {vendido && (
          <div className="absolute inset-0 grid place-items-center bg-zinc-950/70">
            <span className="rounded-md border border-zinc-500 px-2.5 py-1 text-xs font-bold tracking-widest text-zinc-100">
              VENDIDO
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug font-medium text-zinc-100">
          {anuncio.titulo}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <span className="font-display text-lg font-bold text-fuchsia-400">
            {formatBRL(anuncio.preco)}
          </span>
          <span className="text-[11px] font-medium text-violet-300 opacity-0 transition-opacity group-hover:opacity-100">
            ver →
          </span>
        </div>
      </div>
    </Link>
  );
}
