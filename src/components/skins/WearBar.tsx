// Barra de desgaste: 5 faixas proporcionais (FN→BS), a faixa do item acesa,
// as outras apagadas, e um marcador na posição exata do float.
const FAIXAS = [
  { nome: "FN", min: 0, max: 0.07, cor: "#22c55e" },
  { nome: "MW", min: 0.07, max: 0.15, cor: "#84cc16" },
  { nome: "FT", min: 0.15, max: 0.38, cor: "#eab308" },
  { nome: "WW", min: 0.38, max: 0.45, cor: "#f97316" },
  { nome: "BS", min: 0.45, max: 1, cor: "#ef4444" },
] as const;

export function WearBar({ float, className }: { float: number; className?: string }) {
  const valor = Math.min(Math.max(float, 0), 1);
  const ativa = FAIXAS.findIndex((f) => valor < f.max || f.max === 1);

  return (
    <div className={className}>
      <div className="wear-track" role="img" aria-label={`Float ${float}`}>
        {FAIXAS.map((f, i) => (
          <span
            key={f.nome}
            className="wear-seg"
            data-active={i === ativa}
            style={{ flexBasis: `${(f.max - f.min) * 100}%`, background: f.cor }}
          />
        ))}
        <span className="wear-marker" style={{ left: `${valor * 100}%` }} />
      </div>
      <div className="wear-labels" aria-hidden="true">
        {FAIXAS.map((f, i) => (
          <span key={f.nome} data-active={i === ativa} style={{ flexBasis: `${(f.max - f.min) * 100}%` }}>
            {f.nome}
          </span>
        ))}
      </div>
    </div>
  );
}
