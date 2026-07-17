"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { SkinImage } from "@/components/skins/SkinImage";
import { WearBar } from "@/components/skins/WearBar";

// Painel principal da skin: barra superior (categoria + miniaturas), imagem
// grande e a barra de float com o valor exato.
export function SkinShowcase({
  imagens,
  titulo,
  categoria,
  float,
  vendido,
}: {
  imagens: string[];
  titulo: string;
  categoria: string;
  float: number | null;
  vendido?: boolean;
}) {
  const [ativa, setAtiva] = useState(0);
  const principal = imagens[ativa] ?? imagens[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900">
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-300 uppercase">
          <span className="size-2 rounded-full bg-violet-400" />
          {categoria}
        </span>
        {imagens.length > 1 && (
          <div className="flex gap-1.5">
            {imagens.map((url, i) => (
              <button
                key={url + i}
                type="button"
                onClick={() => setAtiva(i)}
                aria-label={`Imagem ${i + 1}`}
                className={cn(
                  "relative size-9 overflow-hidden rounded-md border bg-neutral-950",
                  i === ativa ? "border-violet-500" : "border-white/10 hover:border-white/25"
                )}
              >
                <SkinImage src={url} alt="" sizes="36px" fit="contain" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Imagem */}
      <div className="relative aspect-[16/10] bg-[radial-gradient(60%_60%_at_50%_42%,rgba(124,58,237,0.12),transparent_70%)]">
        <SkinImage
          src={principal}
          alt={titulo}
          fit="contain"
          sizes="(max-width: 1024px) 100vw, 680px"
          priority
        />
        {vendido && (
          <div className="absolute inset-0 grid place-items-center bg-neutral-950/70">
            <span className="rounded-md border border-zinc-500 px-3 py-1.5 text-sm font-bold tracking-widest text-zinc-100">
              VENDIDO
            </span>
          </div>
        )}
      </div>

      {/* Float */}
      {float != null && (
        <div className="px-5 pt-2 pb-5">
          <WearBar float={float} />
          <p className="mt-2 text-center text-xs text-zinc-400">
            Float Value:{" "}
            <span className="font-mono text-zinc-200">{float}</span>
          </p>
        </div>
      )}
    </div>
  );
}
