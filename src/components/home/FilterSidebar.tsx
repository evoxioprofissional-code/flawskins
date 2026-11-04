"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { FloatSlider } from "@/components/home/FloatSlider";
import { ABBR_TO_EXT, WEAR_ABBRS } from "@/lib/exterior";
import { formatBRL } from "@/lib/format";
import { CATEGORIAS } from "@/types/database";

const MARKET_RARITIES = [
  ["#b0c3d9", "Consumer Grade"],
  ["#5e98d9", "Industrial Grade"],
  ["#4b69ff", "Mil-Spec"],
  ["#8847ff", "Restricted"],
  ["#d32ce6", "Classified"],
  ["#eb4b4b", "Covert / Especial"],
  ["#e4ae39", "Contraband"],
] as const;

const FILTERS = ["pmin", "pmax", "fmin", "fmax", "ext", "raridade", "categoria", "pintura", "extra"];

const PRICE_STEPS = 1000;

export function FilterSidebar({ finishes, histogram, highestPrice }: { finishes: string[]; histogram: number[]; highestPrice: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const exteriors = (params.get("ext") ?? "").split(",").filter(Boolean);
  const peak = Math.max(1, ...histogram);
  const [priceDraft, setPriceDraft] = useState<number>();
  const minPrice = Math.max(0, Number(params.get("pmin")?.replace(",", ".")) || 0);
  const priceScale = Math.log1p(highestPrice);
  const pricePosition = priceDraft ?? Math.round(Math.log1p(minPrice) / priceScale * PRICE_STEPS);
  const priceAt = (position: number) => position === PRICE_STEPS
    ? highestPrice
    : Math.floor(Math.expm1(position / PRICE_STEPS * priceScale) * 100) / 100;
  const minFloat = Number((params.get("fmin") ?? "0").replace(",", "."));
  const maxFloat = Number((params.get("fmax") ?? "1").replace(",", "."));

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (next.toString() !== params.toString()) {
      router.push(next.size ? `/?${next}` : "/", { scroll: false });
    }
  }

  function commitPrice(position: number) {
    if (priceDraft === undefined) return;
    const price = priceAt(position);
    if (price === minPrice) setPriceDraft(undefined);
    else update({ pmin: price > 0 ? String(price) : "" });
  }

  function select(key: string, options: ReadonlyArray<readonly [string, string]>, label: string) {
    const current = params.get(key) ?? "";
    return (
      <select className="marketplace-filter-input" aria-label={label} value={current} onChange={(event) => update({ [key]: event.target.value })}>
        <option value="">Todas as opções</option>
        {current && !options.some(([value]) => value === current) && <option value={current}>{current}</option>}
        {options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select>
    );
  }

  return (
    <div className="marketplace-filters">
      <div className="marketplace-filter-body">
        <Section title="Preço" expanded>
          <div className="marketplace-price-chart">
            {histogram.map((count, index) => (
              <span key={index} aria-hidden="true" style={{ height: `${8 + 8 * count / peak}px`, opacity: count ? 1 : 0.38 }} />
            ))}
            <input
              className="marketplace-price-range"
              type="range"
              min={0}
              max={PRICE_STEPS}
              value={pricePosition}
              aria-label="Ajustar preço mínimo"
              aria-valuetext={formatBRL(priceDraft === undefined ? minPrice : priceAt(pricePosition))}
              onChange={(event) => setPriceDraft(event.currentTarget.valueAsNumber)}
              onPointerUp={(event) => commitPrice(event.currentTarget.valueAsNumber)}
              onPointerCancel={() => setPriceDraft(undefined)}
              onKeyUp={(event) => commitPrice(event.currentTarget.valueAsNumber)}
            />
          </div>
          <div className="marketplace-filter-pair">
            {(["pmin", "pmax"] as const).map((key) => (
              <input
                key={key}
                type="number"
                min={0}
                step="any"
                aria-label={key === "pmin" ? "Preço mínimo" : "Preço máximo"}
                placeholder={key === "pmin" ? "R$ 0,00" : "R$ ∞"}
                defaultValue={params.get(key) ?? ""}
                onBlur={(event) => update({ [key]: event.currentTarget.value })}
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                className="marketplace-filter-input"
              />
            ))}
          </div>
        </Section>

        <Section title="Float" expanded>
          <FloatSlider
            min={Number.isFinite(minFloat) ? Math.min(1, Math.max(0, minFloat)) : 0}
            max={Number.isFinite(maxFloat) ? Math.min(1, Math.max(0, maxFloat)) : 1}
            onCommit={(min, max) => update({ fmin: min > 0 ? String(min) : "", fmax: max < 1 ? String(max) : "" })}
          />
          <div className="marketplace-conditions">
            {WEAR_ABBRS.map((abbr) => (
              <label key={abbr}>
                <input type="checkbox" checked={exteriors.includes(abbr)} onChange={(event) => update({
                  ext: (event.target.checked ? [...exteriors, abbr] : exteriors.filter((value) => value !== abbr)).join(","),
                })} />
                {ABBR_TO_EXT[abbr]} ({abbr})
              </label>
            ))}
          </div>
        </Section>

        <Section title="Raridade">{select("raridade", MARKET_RARITIES, "Raridade")}</Section>
        <Section title="Tipo">{select("categoria", CATEGORIAS.map((item) => [item, item]), "Tipo")}</Section>
        <Section title="Pintura">{select("pintura", finishes.map((item) => [item, item]), "Pintura")}</Section>
        <Section title="Pattern"><p className="marketplace-filter-note">Os anúncios ainda não registram o índice de pattern.</p></Section>
        <Section title="Extras" count={params.has("extra") ? 1 : undefined}>
          {select("extra", [["StatTrak", "StatTrak™"], ["Souvenir", "Souvenir"]], "Extras")}
        </Section>
      </div>
      <div className="marketplace-filter-footer">
        <button type="button" onClick={() => update(Object.fromEntries(FILTERS.map((key) => [key, ""])))}>
          <Trash2 aria-hidden="true" /> Limpar filtros
        </button>
      </div>
    </div>
  );
}

function Section({ title, expanded, count, children }: { title: string; expanded?: boolean; count?: number; children: React.ReactNode }) {
  return (
    <details className="marketplace-filter-section" open={expanded}>
      <summary>{title}{count && <span>{count}</span>}<ChevronDown aria-hidden="true" /></summary>
      {children}
    </details>
  );
}
