"use client";

import { useRef, useState } from "react";

// Slider de float com duas alças arrastáveis sobre a barra FN→BS.
// Comita (mín, máx) ao soltar a alça ou sair do input.
export function FloatSlider({
  min: initMin,
  max: initMax,
  onCommit,
}: {
  min: number;
  max: number;
  onCommit: (min: number, max: number) => void;
}) {
  const [min, setMin] = useState(initMin);
  const [max, setMax] = useState(initMax);
  const [draftMin, setDraftMin] = useState<string>();
  const [draftMax, setDraftMax] = useState<string>();
  const minRef = useRef(min);
  const maxRef = useRef(max);
  minRef.current = min;
  maxRef.current = max;

  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<null | "min" | "max">(null);

  function valorEm(clientX: number) {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const raw = (clientX - rect.left) / rect.width;
    return Math.min(1, Math.max(0, Math.round(raw * 100) / 100));
  }

  function onDown(which: "min" | "max") {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragging.current = which;
    };
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const v = valorEm(e.clientX);
    if (dragging.current === "min") setMin(Math.min(v, maxRef.current));
    else setMax(Math.max(v, minRef.current));
  }
  function onUp() {
    if (!dragging.current) return;
    dragging.current = null;
    onCommit(minRef.current, maxRef.current);
  }

  function editar(which: "min" | "max", value: string) {
    let v = Number(value.replace(",", "."));
    if (!Number.isFinite(v)) v = which === "min" ? 0 : 1;
    v = Math.min(1, Math.max(0, v));
    if (which === "min") {
      const nv = Math.min(v, max);
      setMin(nv);
      onCommit(nv, max);
    } else {
      const nv = Math.max(v, min);
      setMax(nv);
      onCommit(min, nv);
    }
  }

  const minPct = min * 100;
  const maxPct = max * 100;

  return (
    <div>
      {/* Barra + alças */}
      <div className="marketplace-float-track">
        <div
          ref={barRef}
          className="marketplace-float-gradient"
        >
          {/* Escurece fora do intervalo selecionado */}
          <div
            className="absolute inset-y-0 left-0 rounded-l-full bg-neutral-900/70"
            style={{ width: `${minPct}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 rounded-r-full bg-neutral-900/70"
            style={{ width: `${100 - maxPct}%` }}
          />

          {/* Alça mín */}
          <button
            type="button"
            aria-label="Float mínimo"
            onPointerDown={onDown("min")}
            onPointerMove={onMove}
            onPointerUp={onUp}
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none"
            style={{ left: `${minPct}%` }}
          >
            <span className="marketplace-float-thumb" />
          </button>

          {/* Alça máx */}
          <button
            type="button"
            aria-label="Float máximo"
            onPointerDown={onDown("max")}
            onPointerMove={onMove}
            onPointerUp={onUp}
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none"
            style={{ left: `${maxPct}%` }}
          >
            <span className="marketplace-float-thumb" />
          </button>
        </div>
      </div>

      {/* Inputs numéricos (sincronizados) */}
      <div className="marketplace-filter-pair">
        <label className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
          <span className="sr-only">Mínimo</span>
          <input
            type="text"
            inputMode="decimal"
            value={draftMin ?? min.toFixed(4).replace(".", ",")}
            onChange={(e) => setDraftMin(e.target.value)}
            onBlur={(e) => { editar("min", e.target.value); setDraftMin(undefined); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="marketplace-filter-input"
          />
        </label>
        <label className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
          <span className="sr-only">Máximo</span>
          <input
            type="text"
            inputMode="decimal"
            value={draftMax ?? max.toFixed(4).replace(".", ",")}
            onChange={(e) => setDraftMax(e.target.value)}
            onBlur={(e) => { editar("max", e.target.value); setDraftMax(undefined); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="marketplace-filter-input"
          />
        </label>
      </div>
    </div>
  );
}
