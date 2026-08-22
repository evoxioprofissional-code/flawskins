import { Suspense } from "react";
import { AlertTriangle, Search } from "lucide-react";

import { listarAnuncios } from "@/actions/anuncios";
import { getPrecosGrade } from "@/lib/precos";
import { ABBR_TO_EXT } from "@/lib/exterior";
import { SkinGrid } from "@/components/skins/SkinGrid";
import { Hero } from "@/components/home/Hero";
import { TopCategoryNav } from "@/components/home/TopCategoryNav";
import { FeatureStrip } from "@/components/home/FeatureStrip";
import { SortSelect } from "@/components/home/SortSelect";
import { FilterSidebar } from "@/components/home/FilterSidebar";
import type { Anuncio } from "@/types/database";

// Feed sempre fresco no MVP.
export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  categoria?: string;
  ordem?: string;
  pmin?: string;
  pmax?: string;
  fmin?: string;
  fmax?: string;
  ext?: string;
};

const num = (v?: string) => {
  const n = v ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const { q, categoria, ordem, pmin, pmax, fmin, fmax, ext } = sp;
  const temBusca = Boolean(q || categoria || pmin || pmax || fmin || fmax || ext);

  const exteriores = ext
    ? ext.split(",").map((a) => ABBR_TO_EXT[a]).filter(Boolean)
    : undefined;

  let anuncios: Anuncio[] = [];
  let erro = false;
  try {
    anuncios = await listarAnuncios({
      q,
      categoria,
      ordem,
      precoMin: num(pmin),
      precoMax: num(pmax),
      floatMin: num(fmin),
      floatMax: num(fmax),
      exteriores,
    });
  } catch {
    erro = true;
  }

  // Remonta o sidebar (inputs) quando os filtros mudam de fora (ex: Limpar).
  const sidebarKey = `${pmin ?? ""}|${pmax ?? ""}|${fmin ?? ""}|${fmax ?? ""}|${ext ?? ""}`;

  // Preços Buff cacheados (leitura em lote, sem chamar a API) pro selo nos cards.
  const precos = erro ? undefined : await getPrecosGrade(anuncios.map((a) => a.titulo));

  const grid = erro ? (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-6 text-sm text-zinc-300">
      <AlertTriangle className="size-5 text-blue-400" />
      Não foi possível carregar o feed agora. Tente novamente em instantes.
    </div>
  ) : (
    <SkinGrid anuncios={anuncios} busca={temBusca} precos={precos} />
  );

  const marketplace = (
    <div className="w-full px-4 sm:px-6">
      <Suspense>
        <TopCategoryNav />
      </Suspense>
      <div className="mt-5 flex gap-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-20">
            <Suspense>
              <FilterSidebar key={sidebarKey} />
            </Suspense>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <form action="/" className="relative min-w-0 flex-1">
              {categoria && (
                <input type="hidden" name="categoria" value={categoria} />
              )}
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Buscar skins, facas, luvas, vendedor..."
                aria-label="Buscar skins"
                className="h-11 w-full rounded-lg border border-white/10 bg-neutral-900 pr-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 focus:outline-none"
              />
            </form>
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            {anuncios.length} skin{anuncios.length === 1 ? "" : "s"}
            {q ? ` para "${q}"` : ""}
          </p>
          {grid}
        </div>
      </div>
    </div>
  );

  // Modo busca/filtro: só o marketplace.
  if (temBusca) {
    return <div className="py-6">{marketplace}</div>;
  }

  return (
    <>
      <Hero />
      <div id="skins" className="scroll-mt-20 pt-6 pb-10">
        {marketplace}
      </div>
      <FeatureStrip />
    </>
  );
}
