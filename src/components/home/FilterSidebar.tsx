"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { WEAR_ABBRS } from "@/lib/exterior";
import { FloatSlider } from "@/components/home/FloatSlider";

const num = (v: string | null): number | undefined => {
  const n = v ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

// Sidebar de filtros (estilo CSFloat): preço, desgaste e float.
// Inputs são não-controlados; o pai remonta via `key` quando os params mudam.
export function FilterSidebar() {
  const router = useRouter();
  const params = useSearchParams();

  function push(mut: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params.toString());
    mut(p);
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  }

  function setNum(key: string, value: string) {
    const v = value.replace(",", ".").trim();
    push((p) => {
      if (v && Number(v) >= 0) p.set(key, v);
      else p.delete(key);
    });
  }

  const extAtivos = new Set((params.get("ext") || "").split(",").filter(Boolean));
  function toggleExt(abbr: string) {
    push((p) => {
      const cur = new Set((p.get("ext") || "").split(",").filter(Boolean));
      if (cur.has(abbr)) cur.delete(abbr);
      else cur.add(abbr);
      if (cur.size) p.set("ext", [...cur].join(","));
      else p.delete("ext");
    });
  }

  const temFiltro =
    params.has("pmin") ||
    params.has("pmax") ||
    params.has("fmin") ||
    params.has("fmax") ||
    params.has("ext");

  const numInput =
    "h-9 w-full rounded-md border border-white/10 bg-neutral-950 px-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none";

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
          Filtros
        </h2>
        {temFiltro && (
          <button
            type="button"
            onClick={() => router.push("/", { scroll: false })}
            className="text-xs font-medium text-violet-400 hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      {/* PREÇO */}
      <Secao titulo="Preço">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
            De
            <input
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="R$ 0"
              defaultValue={params.get("pmin") ?? ""}
              onBlur={(e) => setNum("pmin", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setNum("pmin", e.currentTarget.value)}
              className={cn(numInput, "mt-1")}
            />
          </label>
          <label className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
            Até
            <input
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="R$ máx"
              defaultValue={params.get("pmax") ?? ""}
              onBlur={(e) => setNum("pmax", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setNum("pmax", e.currentTarget.value)}
              className={cn(numInput, "mt-1")}
            />
          </label>
        </div>
      </Secao>

      {/* FLOAT */}
      <Secao titulo="Float">
        <FloatSlider
          min={num(params.get("fmin")) ?? 0}
          max={num(params.get("fmax")) ?? 1}
          onCommit={(mn, mx) =>
            push((p) => {
              if (mn > 0) p.set("fmin", String(mn));
              else p.delete("fmin");
              if (mx < 1) p.set("fmax", String(mx));
              else p.delete("fmax");
            })
          }
        />
        <div className="mt-3 flex gap-1.5">
          {WEAR_ABBRS.map((abbr) => {
            const ativo = extAtivos.has(abbr);
            return (
              <button
                key={abbr}
                type="button"
                onClick={() => toggleExt(abbr)}
                className={cn(
                  "flex-1 rounded-md border py-1.5 text-xs font-bold transition-colors",
                  ativo
                    ? "border-violet-500 bg-violet-500/15 text-violet-200"
                    : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                )}
              >
                {abbr}
              </button>
            );
          })}
        </div>
      </Secao>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/5 py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2.5 text-[11px] font-bold tracking-widest text-zinc-500 uppercase">
        {titulo}
      </h3>
      {children}
    </div>
  );
}
