"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

// Galeria do detalhe: imagem principal + miniaturas clicáveis.
export function SkinGallery({
  imagens,
  titulo,
  vendido,
}: {
  imagens: string[];
  titulo: string;
  vendido?: boolean;
}) {
  const [ativa, setAtiva] = useState(0);
  const principal = imagens[ativa] ?? imagens[0];

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <Image
          src={principal}
          alt={titulo}
          fill
          sizes="(max-width: 768px) 100vw, 42rem"
          className="object-contain"
          priority
        />
        {vendido && (
          <div className="absolute inset-0 grid place-items-center bg-zinc-950/70">
            <span className="rounded-md border border-zinc-500 px-3 py-1.5 text-sm font-bold tracking-widest text-zinc-100">
              VENDIDO
            </span>
          </div>
        )}
      </div>

      {imagens.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {imagens.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setAtiva(i)}
              aria-label={`Ver imagem ${i + 1}`}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-zinc-950 transition-all",
                i === ativa
                  ? "border-violet-500 ring-1 ring-violet-500/60"
                  : "border-zinc-800 hover:border-zinc-600"
              )}
            >
              <Image
                src={url}
                alt={`${titulo} — imagem ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
