"use client";

import { useState } from "react";

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
        <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
          Preenchido com <strong>{seed.titulo}</strong> — confira, defina o preço
          e publique. Você ainda pode adicionar mais fotos.
        </p>
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
