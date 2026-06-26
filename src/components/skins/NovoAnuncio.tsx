"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { SkinForm } from "@/components/skins/SkinForm";
import { ImportarSteam } from "@/components/skins/ImportarSteam";
import { floatDaSkin } from "@/actions/steam";
import type { ItemInventario } from "@/lib/steam";

type Seed = ItemInventario & { float: number | null };

// Junta o import da Steam ao formulário: ao escolher uma skin, busca o float
// (via inspect link) e remonta o form já preenchido.
export function NovoAnuncio(props: {
  defaultNome: string;
  defaultWhatsapp: string;
  defaultCidade: string;
}) {
  const [seed, setSeed] = useState<Seed | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function escolher(item: ItemInventario) {
    setBuscando(true);
    const float = item.inspectLink ? await floatDaSkin(item.inspectLink) : null;
    setSeed({ ...item, float });
    setBuscando(false);
  }

  return (
    <div className="space-y-6">
      <ImportarSteam onPick={escolher} />

      {buscando && (
        <p className="flex items-center gap-2 rounded-lg bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300">
          <Loader2 className="size-3.5 animate-spin" /> Buscando o float da skin…
        </p>
      )}

      {seed && !buscando && (
        <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
          Preenchido com <strong>{seed.titulo}</strong>
          {seed.float != null
            ? ` · float ${seed.float}`
            : " · float não disponível (preencha manualmente se quiser)"}
          . Defina o preço e publique.
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
        defaultFloat={seed?.float ?? undefined}
        seedImageUrl={seed?.image || undefined}
      />
    </div>
  );
}
