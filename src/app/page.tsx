import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

import { listarAnuncios } from "@/actions/anuncios";
import { SkinGrid } from "@/components/skins/SkinGrid";
import type { Anuncio } from "@/types/database";

// Feed sempre fresco no MVP.
export const dynamic = "force-dynamic";

type Search = { q?: string; categoria?: string };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q, categoria } = await searchParams;
  const temFiltro = Boolean(q || categoria);

  let anuncios: Anuncio[] = [];
  let erro = false;
  try {
    anuncios = await listarAnuncios({ q, categoria });
  } catch {
    erro = true;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5">
      {/* Hero curto com a vibe Asiimov */}
      <section className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          Skins de CS2,{" "}
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            direto com o vendedor
          </span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          O classificado P2P da comunidade. Encontrou? Fecha no WhatsApp.
        </p>
      </section>

      {/* Chip de filtro ativo */}
      {temFiltro && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-400">
            {anuncios.length} resultado{anuncios.length === 1 ? "" : "s"}
          </span>
          {q && <FilterChip label={`"${q}"`} />}
          {categoria && <FilterChip label={categoria} />}
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <X className="size-3" /> limpar
          </Link>
        </div>
      )}

      {erro ? (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-6 text-sm text-zinc-300">
          <AlertTriangle className="size-5 text-fuchsia-400" />
          Não foi possível carregar o feed agora. Tente novamente em instantes.
        </div>
      ) : (
        <SkinGrid anuncios={anuncios} busca={temFiltro} />
      )}
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
      {label}
    </span>
  );
}
