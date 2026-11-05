import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Chips, EsportsErrorState, EsportsState, Pagination, TeamLogo, intParam, qs, strParam } from "@/components/esports/bits";
import { EsportsHeader } from "@/components/esports/EsportsHeader";
import { formatShortDate, formatDate } from "@/lib/esports/datetime";
import { getViewerTimeZone, listTournaments } from "@/lib/esports/service";
import type { Paginated, Tournament, TournamentPhase } from "@/lib/esports/types";

const PHASES = ["running", "upcoming", "past"] as const;
const PHASE_LABEL: Record<TournamentPhase, string> = { running: "Em andamento", upcoming: "Próximos", past: "Encerrados" };

const PER_PAGE = 20;

function dateRange(t: Tournament, tz: string) {
  if (!t.beginAt && !t.endAt) return "Datas a definir";
  if (t.beginAt && t.endAt) return `${formatShortDate(t.beginAt, tz)} – ${formatDate(t.endAt, tz)}`;
  return formatDate((t.beginAt ?? t.endAt) as string, tz);
}

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const phase = strParam(sp.status, PHASES, "running");
  const page = intParam(sp.page);
  const tz = await getViewerTimeZone();

  let result: Paginated<Tournament> | null = null;
  let error: unknown = null;
  try {
    result = await listTournaments({ phase, page, perPage: PER_PAGE });
  } catch (e) {
    error = e;
  }

  const href = (p: { status?: TournamentPhase; page?: number }) =>
    qs("/esports/tournaments", {
      status: (p.status ?? phase) === "running" ? undefined : (p.status ?? phase),
      page: p.page && p.page > 1 ? p.page : undefined,
    });
  const totalPages = result?.total != null ? Math.max(1, Math.ceil(result.total / PER_PAGE)) : null;
  const hasNext = result ? (totalPages ? page < totalPages : result.items.length >= PER_PAGE) : false;

  return (
    <>
      <EsportsHeader
        title="Campeonatos"
        description="Ligas, torneios e etapas com datas e partidas oficiais."
        stats={[{ label: PHASE_LABEL[phase], value: result?.total }]}
        controls={
          <Chips
            label="Situação"
            items={PHASES.map((p) => ({ key: p, label: PHASE_LABEL[p], href: href({ status: p, page: 1 }), active: p === phase }))}
          />
        }
      />

      {error ? (
        <EsportsErrorState error={error} />
      ) : !result || result.items.length === 0 ? (
        <EsportsState title="Nenhum campeonato encontrado" description={`Não há campeonatos de CS2 ${PHASE_LABEL[phase].toLowerCase()} no momento.`} />
      ) : (
        <>
          <div className="esports-list">
            {result.items.map((t) => (
              <Link key={t.id} href={`/esports/tournaments/${t.id}`} className="esports-tournament">
                <TeamLogo src={t.league?.logo} name={t.league?.name ?? t.name} />
                <div className="min-w-0">
                  <h3>
                    {t.league?.name ?? "Campeonato"}
                    {t.serie?.name ? ` · ${t.serie.name}` : ""}
                  </h3>
                  <p>
                    {[t.name, t.tier ? `Tier ${t.tier.toUpperCase()}` : null, t.matchCount != null ? `${t.matchCount} ${t.matchCount === 1 ? "partida" : "partidas"}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="esports-tournament-dates">
                  <div>{dateRange(t, tz)}</div>
                  <div className="text-zinc-500">{PHASE_LABEL[phase]}</div>
                </div>
                <ChevronRight className="size-4 text-zinc-500" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <Pagination page={page} hasNext={hasNext} totalPages={totalPages} href={(p) => href({ page: p })} />
        </>
      )}
    </>
  );
}
