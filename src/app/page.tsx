import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

import { listarAnuncios } from "@/actions/anuncios";
import { getShowcaseSkins } from "@/lib/skins-showcase";
import { createClient } from "@/lib/supabase/server";
import { SkinGrid } from "@/components/skins/SkinGrid";
import { Hero } from "@/components/home/Hero";
import { CategoryBar } from "@/components/home/CategoryBar";
import { FeatureStrip } from "@/components/home/FeatureStrip";
import { CommunityBanner } from "@/components/home/CommunityBanner";
import { SortSelect } from "@/components/home/SortSelect";
import type { Anuncio } from "@/types/database";

// Feed sempre fresco no MVP.
export const dynamic = "force-dynamic";

type Search = { q?: string; categoria?: string; ordem?: string };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q, categoria, ordem } = await searchParams;
  const temFiltro = Boolean(q || categoria);

  let anuncios: Anuncio[] = [];
  let erro = false;
  try {
    anuncios = await listarAnuncios({ q, categoria, ordem });
  } catch {
    erro = true;
  }

  const grid = erro ? (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-6 text-sm text-zinc-300">
      <AlertTriangle className="size-5 text-fuchsia-400" />
      Não foi possível carregar o feed agora. Tente novamente em instantes.
    </div>
  ) : (
    <SkinGrid anuncios={anuncios} busca={temFiltro} />
  );

  // Modo busca/filtro: página enxuta, focada no resultado.
  if (temFiltro) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <CategoryBar ativa={categoria} />
        <div className="mt-5 mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-300">
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
          <div className="ml-auto">
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>
        </div>
        {grid}
      </div>
    );
  }

  // Skins pra compor o hero: renders limpos (PNG transparente) de skins
  // icônicas via CS2-API. Se a API falhar, cai nas imagens dos anúncios.
  let heroSkins = await getShowcaseSkins();
  if (heroSkins.length === 0) {
    heroSkins = anuncios.map((a) => a.image_url).filter(Boolean).slice(0, 5);
  }

  // Prova social real: avatares de vendedores da comunidade + nº de usuários.
  const supabase = await createClient();
  const [{ data: avatares }, { count: membros }] = await Promise.all([
    supabase
      .from("profiles")
      .select("avatar_url")
      .not("avatar_url", "is", null)
      .limit(5)
      .returns<{ avatar_url: string }[]>(),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const heroAvatares = (avatares ?? []).map((a) => a.avatar_url);

  // Home: hero + categorias + grade + diferenciais.
  return (
    <>
      <Hero
        total={anuncios.length}
        skins={heroSkins}
        avatares={heroAvatares}
        membros={membros ?? 0}
      />

      <div id="skins" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-8">
        <CategoryBar ativa={categoria} />
        <div className="mt-6 mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-zinc-100">À venda agora</h2>
            <p className="text-sm text-zinc-400">
              Skins da comunidade, atualizadas em tempo real.
            </p>
          </div>
          <Suspense>
            <SortSelect />
          </Suspense>
        </div>
        {grid}
      </div>

      <CommunityBanner />
      <FeatureStrip />
    </>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
      {label}
    </span>
  );
}
