import Image from "next/image";
import Link from "next/link";

import type { Anuncio } from "@/types/database";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SkinCard({ anuncio }: { anuncio: Anuncio }) {
  const vendido = anuncio.status === "vendido";

  return (
    <Link
      href={`/skin/${anuncio.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all",
        "hover:border-violet-500/50 hover:shadow-[0_0_20px_-6px] hover:shadow-violet-500/30"
      )}
    >
      {/* Imagem */}
      <div className="relative aspect-square overflow-hidden bg-zinc-950">
        <Image
          src={anuncio.image_url}
          alt={anuncio.titulo}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {vendido && (
          <div className="absolute inset-0 grid place-items-center bg-zinc-950/70">
            <span className="rounded-md border border-zinc-600 px-2 py-1 text-xs font-bold tracking-widest text-zinc-200">
              VENDIDO
            </span>
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-md bg-zinc-950/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur">
          {anuncio.categoria}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-zinc-100">
          {anuncio.titulo}
        </h3>
        <span className="text-[11px] text-zinc-400">{anuncio.exterior}</span>
        <span className="mt-auto text-base font-bold text-orange-400">
          {formatBRL(anuncio.preco)}
        </span>
      </div>
    </Link>
  );
}
