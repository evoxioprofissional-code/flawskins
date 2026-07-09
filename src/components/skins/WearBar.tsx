// Barra de desgaste (float) no estilo dos sites de skin: gradiente FN→BS
// com um marcador na posição exata do float.
const FAIXAS = [
  { nome: "FN", max: 0.07 },
  { nome: "MW", max: 0.15 },
  { nome: "FT", max: 0.38 },
  { nome: "WW", max: 0.45 },
  { nome: "BS", max: 1.0 },
] as const;

export function WearBar({ float }: { float: number }) {
  const pct = Math.min(Math.max(float, 0), 1) * 100;

  return (
    <div>
      <div className="relative h-2.5 rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#84cc16_14%,#eab308_28%,#f97316_45%,#ef4444_100%)]">
        {/* Divisórias das faixas */}
        {FAIXAS.slice(0, -1).map((f) => (
          <span
            key={f.nome}
            className="absolute top-0 h-full w-px bg-black/30"
            style={{ left: `${f.max * 100}%` }}
          />
        ))}
        {/* Marcador do float */}
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-zinc-950 shadow-[0_0_10px_rgba(0,0,0,0.6)]"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-medium text-zinc-600">
        {FAIXAS.map((f) => (
          <span key={f.nome}>{f.nome}</span>
        ))}
      </div>
    </div>
  );
}
