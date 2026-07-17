"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { SkinForm } from "@/components/skins/SkinForm";
import { ImportarSteam } from "@/components/skins/ImportarSteam";
import type { ItemInventario } from "@/lib/steam";

// Junta o import da Steam ao formulário: ao escolher uma skin, o form é
// remontado já preenchido (título, categoria, desgaste e imagem).
export function NovoAnuncio(props: {
  defaultNome: string;
  defaultWhatsapp: string;
  defaultCidade: string;
}) {
  const [seed, setSeed] = useState<ItemInventario | null>(null);

  return (
    <div className="space-y-6">
      <ImportarSteam onPick={setSeed} />

      {seed && (
        <div className="rounded-lg bg-violet-500/10 px-3 py-2.5 text-xs text-violet-200">
          Preenchido com <strong>{seed.titulo}</strong> — confira, defina o preço
          e publique.{" "}
          <span className="text-violet-300/80">
            O float não vem no inventário da Steam: se quiser mostrá-lo, veja no
            jogo (inspecionar a skin) e preencha o campo Float.
          </span>
          {seed.inspectLink && (
            <>
              {" "}
              <a
                href={`https://csfloat.com/checker?inspect=${encodeURIComponent(seed.inspectLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-violet-100 underline underline-offset-2"
              >
                Ver float <ExternalLink className="size-3" />
              </a>
            </>
          )}
        </div>
      )}

      <SkinForm
        key={seed?.assetId ?? "manual"}
        defaultNome={props.defaultNome}
        defaultWhatsapp={props.defaultWhatsapp}
        defaultCidade={props.defaultCidade}
        defaultTitulo={seed?.titulo}
        defaultCategoria={seed?.categoria}
        defaultExterior={seed?.exterior}
        seedImageUrl={seed?.image || undefined}
      />
    </div>
  );
}
