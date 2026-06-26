import Link from "next/link";
import { PackageOpen } from "lucide-react";

import type { Anuncio } from "@/types/database";
import { SkinCard } from "@/components/skins/SkinCard";

export function SkinGrid({
  anuncios,
  busca = false,
}: {
  anuncios: Anuncio[];
  busca?: boolean;
}) {
  if (anuncios.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
        <PackageOpen className="size-10 text-zinc-600" />
        {busca ? (
          <>
            <p className="mt-3 text-sm font-medium text-zinc-300">
              Nenhuma skin encontrada
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Tente outra busca ou categoria.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm font-medium text-zinc-300">
              Nenhuma skin anunciada ainda
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Seja o primeiro a vender por aqui.
            </p>
            <Link
              href="/novo"
              className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-600"
            >
              Anunciar uma skin
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {anuncios.map((anuncio) => (
        <SkinCard key={anuncio.id} anuncio={anuncio} />
      ))}
    </div>
  );
}
