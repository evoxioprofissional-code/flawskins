import { timeZoneLabel } from "@/lib/esports/datetime";

export type HeaderStat = {
  label: string;
  value: number | null | undefined;
  tone?: "live";
};

/** "Horário de Brasília (BRT)" ou o fuso do usuário. */
export function tzDescription(tz: string) {
  return `${tz === "America/Sao_Paulo" ? "Horário de Brasília" : tz} (${timeZoneLabel(tz)})`;
}

// Cabeçalho das páginas do E-Sports: contexto (CS2), título, descrição,
// números reais da fonte de dados e a linha de controles (filtros/ordem).
export function EsportsHeader({
  title,
  description,
  stats = [],
  controls,
}: {
  title: string;
  description?: string;
  stats?: HeaderStat[];
  controls?: React.ReactNode;
}) {
  const visible = stats.filter((s) => typeof s.value === "number");

  return (
    <header className="esports-header">
      <div className="esports-header-top">
        <div className="min-w-0">
          <p className="esports-header-eyebrow">
            <span className="esports-context-mark">CS2</span>
            Counter-Strike 2
          </p>
          <h1 className="esports-header-title">{title}</h1>
          {description && <p className="esports-header-desc">{description}</p>}
        </div>

        {visible.length > 0 && (
          <dl className="esports-stats">
            {visible.map((s) => (
              <div key={s.label} className="esports-stat" data-tone={s.tone}>
                <dt>{s.label}</dt>
                <dd>{(s.value as number).toLocaleString("pt-BR")}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {controls && <div className="esports-header-controls">{controls}</div>}
    </header>
  );
}
