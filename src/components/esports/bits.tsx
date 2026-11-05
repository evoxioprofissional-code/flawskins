import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PandaScoreError } from "@/lib/esports/pandascore";
import type { MatchStatus } from "@/lib/esports/types";

// Peças pequenas e reutilizadas pelas páginas do E-Sports.

/**
 * A PandaScore marca no nome do arquivo logos feitos para fundo claro
 * ("..._lightmode"): tinta escura que some no tema escuro. Esses são
 * exibidos em versão clara (monocromática) para continuarem legíveis.
 */
function isLightModeOnly(src: string) {
  const file = src.split("/").pop()?.toLowerCase() ?? "";
  return file.includes("lightmode") && !file.includes("allmode") && !file.includes("darkmode");
}

export function TeamLogo({
  src,
  name,
  size = "md",
}: {
  src: string | null | undefined;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="esports-logo" data-size={size} aria-hidden="true">
      {src ? (
        // Logos vêm da CDN da PandaScore; <img> evita mexer no next.config.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" data-ink={isLightModeOnly(src) || undefined} />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "Agendada",
  live: "Ao vivo",
  finished: "Finalizada",
  postponed: "Adiada",
  canceled: "Cancelada",
  unknown: "Status indefinido",
};

export function statusLabel(status: MatchStatus) {
  return STATUS_LABEL[status];
}

export function StatusBadge({ status }: { status: MatchStatus }) {
  return (
    <span className="esports-status" data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function EsportsState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="esports-state" role="status">
      <Image src="/esports/mascote.webp" alt="" width={152} height={100} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Estado de erro amigável a partir de uma falha da integração. */
export function EsportsErrorState({ error }: { error: unknown }) {
  const kind = error instanceof PandaScoreError ? error.kind : "unknown";
  if (kind === "unknown") console.error("[esports] erro inesperado:", error);
  const copy: Record<string, [string, string]> = {
    config: [
      "Integração não configurada",
      "Defina a variável de ambiente PANDASCORE_TOKEN no servidor (na Vercel: Settings → Environment Variables) e faça um novo deploy.",
    ],
    unauthorized: ["Não foi possível autenticar na fonte de dados", "Verifique o token da PandaScore configurado no servidor."],
    forbidden: ["Dados indisponíveis no plano atual", "Este conteúdo não é fornecido pelo plano atual da PandaScore."],
    rate_limited: ["Muitas consultas em pouco tempo", "O limite da fonte de dados foi atingido. Tente novamente em instantes."],
    timeout: ["A fonte de dados demorou para responder", "Tente novamente em instantes."],
  };
  const [title, description] = copy[kind] ?? [
    "Não foi possível carregar os dados agora",
    "A fonte de dados está instável. Tente novamente em instantes.",
  ];
  return <EsportsState title={title} description={description} />;
}

export function Pagination({
  page,
  hasNext,
  totalPages,
  href,
}: {
  page: number;
  hasNext: boolean;
  totalPages: number | null;
  href: (page: number) => string;
}) {
  if (page <= 1 && !hasNext) return null;
  return (
    <nav className="esports-pagination" aria-label="Paginação">
      {page > 1 ? (
        <Link className="esports-button" href={href(page - 1)} scroll={false}>
          <ChevronLeft aria-hidden="true" /> Anterior
        </Link>
      ) : (
        <span className="esports-button" aria-disabled="true">
          <ChevronLeft aria-hidden="true" /> Anterior
        </span>
      )}
      <span>
        Página {page.toLocaleString("pt-BR")}
        {totalPages ? ` de ${totalPages.toLocaleString("pt-BR")}` : ""}
      </span>
      {hasNext ? (
        <Link className="esports-button" href={href(page + 1)} scroll={false}>
          Próxima <ChevronRight aria-hidden="true" />
        </Link>
      ) : (
        <span className="esports-button" aria-disabled="true">
          Próxima <ChevronRight aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}

export function Chips({
  items,
  label = "Filtro",
}: {
  items: { key: string; label: string; href: string; active: boolean; live?: boolean; count?: number | null }[];
  label?: string;
}) {
  return (
    <div className="esports-chips" role="group" aria-label={label}>
      {items.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          className="esports-chip"
          data-active={c.active}
          aria-current={c.active ? "true" : undefined}
          scroll={false}
        >
          {c.live && <span className="esports-chip-dot" aria-hidden="true" />}
          {c.label}
          {typeof c.count === "number" && c.count > 0 && <span className="esports-chip-count">{c.count}</span>}
        </Link>
      ))}
    </div>
  );
}

/** Lê um inteiro positivo de searchParams (com fallback). */
export function intParam(v: string | string[] | undefined, fallback = 1, max = 10_000): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

export function strParam<T extends string>(v: string | string[] | undefined, allowed: readonly T[], fallback: T): T {
  const s = Array.isArray(v) ? v[0] : v;
  return allowed.includes(s as T) ? (s as T) : fallback;
}

export function qs(base: string, params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}
