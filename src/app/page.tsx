import { Suspense } from "react";
import { AlertTriangle, LayoutGrid, List } from "lucide-react";

import { listarAnuncios } from "@/actions/anuncios";
import { getPrecosGrade } from "@/lib/precos";
import { ABBR_TO_EXT } from "@/lib/exterior";
import { SkinGrid } from "@/components/skins/SkinGrid";
import { StackToggle } from "@/components/home/StackToggle";
import { marketRarity, marketSkinTitle } from "@/lib/market-skin";
import { TopCategoryNav } from "@/components/home/TopCategoryNav";
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
  raridade?: string;
  pintura?: string;
  extra?: string;
  unstacked?: string;
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
  const { q, categoria, ordem, pmin, pmax, fmin, fmax, ext, raridade, pintura, extra, unstacked } = sp;
  const temBusca = Boolean(q || categoria || pmin || pmax || fmin || fmax || ext || raridade || pintura || extra);

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

  const finishes = [...new Set(anuncios.map((item) => marketSkinTitle(item.titulo).finish))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const histogram = Array<number>(22).fill(0);
  const highestPrice = Math.max(1, num(pmin) ?? 0, ...anuncios.map((item) => item.preco));
  for (const item of anuncios) {
    const bucket = Math.min(histogram.length - 1, Math.floor(Math.log1p(Math.max(0, item.preco)) / Math.log1p(highestPrice) * histogram.length));
    histogram[bucket]++;
  }

  const filtered = anuncios.filter((item) =>
    (!raridade || marketRarity(item.titulo, item.categoria) === raridade) &&
    (!pintura || marketSkinTitle(item.titulo).finish === pintura) &&
    (!extra || item.titulo.toLowerCase().includes(extra.toLowerCase()))
  );
  const groups = new Map<string, Anuncio>();
  const stacks = new Map<string, number>();
  for (const item of filtered) {
    const key = JSON.stringify([item.titulo, item.exterior, item.phase]);
    const first = groups.get(key);
    if (!first) groups.set(key, item);
    else stacks.set(first.id, (stacks.get(first.id) ?? 1) + 1);
  }
  const visible = unstacked === "1" ? filtered : [...groups.values()];

  // Remonta o sidebar (inputs) quando os filtros mudam de fora (ex: Limpar).
  const sidebarKey = `${pmin ?? ""}|${pmax ?? ""}|${fmin ?? ""}|${fmax ?? ""}|${ext ?? ""}`;

  // Preços Buff cacheados (leitura em lote, sem chamar a API) pro selo nos cards.
  const precos = erro ? undefined : await getPrecosGrade(visible.map((a) => a.titulo));

  const grid = erro ? (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-6 text-sm text-zinc-300">
      <AlertTriangle className="size-5 text-blue-400" />
      Não foi possível carregar o feed agora. Tente novamente em instantes.
    </div>
  ) : (
    <SkinGrid anuncios={visible} busca={temBusca} precos={precos} stacks={unstacked === "1" ? undefined : stacks} />
  );

  return (
    <div id="skins" className="marketplace">
      <aside className="marketplace-sidebar">
        <Suspense>
          <FilterSidebar key={sidebarKey} finishes={finishes} histogram={histogram} highestPrice={highestPrice} />
        </Suspense>
      </aside>

        <div className="marketplace-results">
          <Suspense><TopCategoryNav /></Suspense>
          <div className="marketplace-toolbar">
            <h2>
              {erro ? "Skins" : `${visible.length.toLocaleString("pt-BR")} ${visible.length === 1 ? "skin encontrada" : "skins encontradas"}`}
              {q ? ` para "${q}"` : ""}
            </h2>
            <Suspense>
              <StackToggle />
              <SortSelect />
            </Suspense>
            <div className="marketplace-view" role="group" aria-label="Visualização">
              <label title="Grade">
                <input type="radio" name="marketplace-view" value="grid" defaultChecked aria-label="Grade" />
                <LayoutGrid aria-hidden="true" />
              </label>
              <label title="Lista">
                <input type="radio" name="marketplace-view" value="list" aria-label="Lista" />
                <List aria-hidden="true" />
              </label>
            </div>
          </div>
          <div className="marketplace-feed">{grid}</div>
        </div>
    </div>
  );
}
