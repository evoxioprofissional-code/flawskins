import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Paginação do feed do Market. Mantém todos os filtros da URL e só troca
// o parâmetro `pagina`.
export function MarketPagination({
  pagina,
  totalPaginas,
  params,
}: {
  pagina: number;
  totalPaginas: number;
  params: Record<string, string | undefined>;
}) {
  if (totalPaginas <= 1) return null;

  const href = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "pagina") next.set(k, v);
    if (p > 1) next.set("pagina", String(p));
    const s = next.toString();
    return s ? `/?${s}` : "/";
  };

  // 1 … 4 5 6 … 12
  const nums = new Set([1, totalPaginas, pagina - 1, pagina, pagina + 1].filter((n) => n >= 1 && n <= totalPaginas));
  const ordem = [...nums].sort((a, b) => a - b);
  const itens: (number | "gap")[] = [];
  ordem.forEach((n, i) => {
    if (i > 0 && n - ordem[i - 1] > 1) itens.push("gap");
    itens.push(n);
  });

  return (
    <nav className="marketplace-pagination" aria-label="Páginas do feed">
      {pagina > 1 ? (
        <Link href={href(pagina - 1)} className="marketplace-page" aria-label="Página anterior">
          <ChevronLeft aria-hidden="true" /> <span>Anterior</span>
        </Link>
      ) : (
        <span className="marketplace-page" aria-disabled="true">
          <ChevronLeft aria-hidden="true" /> <span>Anterior</span>
        </span>
      )}

      <div className="marketplace-page-numbers">
        {itens.map((it, i) =>
          it === "gap" ? (
            <span key={`gap-${i}`} className="marketplace-page-gap" aria-hidden="true">…</span>
          ) : (
            <Link
              key={it}
              href={href(it)}
              className="marketplace-page"
              data-active={it === pagina}
              aria-current={it === pagina ? "page" : undefined}
              aria-label={`Página ${it}`}
            >
              {it}
            </Link>
          ),
        )}
      </div>

      {pagina < totalPaginas ? (
        <Link href={href(pagina + 1)} className="marketplace-page" aria-label="Próxima página">
          <span>Próxima</span> <ChevronRight aria-hidden="true" />
        </Link>
      ) : (
        <span className="marketplace-page" aria-disabled="true">
          <span>Próxima</span> <ChevronRight aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
