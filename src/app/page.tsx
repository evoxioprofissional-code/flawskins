import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

import { listarAnuncios } from "@/actions/anuncios";
import { getShowcaseSkins } from "@/lib/skins-showcase";
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

  const grid = erro ? (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-6 text-sm text-zinc-300">
      <AlertTriangle className="size-5 text-violet-400" />
      Não foi possível carregar o feed agora. Tente novamente em instantes.
    </div>
  ) : (
    <SkinGrid anuncios={anuncios} busca={temBusca} />
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
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-zinc-400">
              {anuncios.length} skin{anuncios.length === 1 ? "" : "s"}
            </span>
            {q && (
              <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5"
              >
                &quot;{q}&quot; <X className="size-3" />
              </Link>
            )}
            <div className="ml-auto">
              <Suspense>
                <SortSelect />
              </Suspense>
            </div>
          </div>
          {grid}
        </div>
      </div>
    </div>
  );

  // Modo busca/filtro: só o marketplace.
  if (temBusca) {
    return <div className="py-6">{marketplace}</div>;
  }

  // Skins pra compor o hero (PNG transparente de skins icônicas, URLs fixas).
  let heroSkins = getShowcaseSkins();
  if (heroSkins.length === 0) {
    heroSkins = anuncios.map((a) => a.image_url).filter(Boolean).slice(0, 5);
  }

  return (
    <>
      <Hero total={anuncios.length} skins={heroSkins} />
      <div id="skins" className="scroll-mt-20 py-10">
        {marketplace}
      </div>
      <FeatureStrip />
    </>
  );
}
