import { Suspense } from "react";

import { Chips, EsportsErrorState, EsportsState, Pagination, intParam, qs, strParam } from "@/components/esports/bits";
import { EsportsHeader } from "@/components/esports/EsportsHeader";
import { MatchCard } from "@/components/esports/MatchCard";
import { ParamSelect } from "@/components/esports/ParamSelect";
import {
  RESULT_PERIODS,
  getViewerTimeZone,
  listResults,
  listTournamentOptions,
  tournamentTitle,
  type ResultPeriod,
} from "@/lib/esports/service";
import type { Match, Paginated } from "@/lib/esports/types";

const PERIOD_LABEL: Record<ResultPeriod, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  all: "Todo o período",
};

const PER_PAGE = 20;

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; campeonato?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const period = strParam(sp.periodo, RESULT_PERIODS, "30d");
  const tournamentId = sp.campeonato ? intParam(sp.campeonato, 0, Number.MAX_SAFE_INTEGER) || undefined : undefined;
  const page = intParam(sp.page);
  const tz = await getViewerTimeZone();
  const now = new Date();

  let result: Paginated<Match> | null = null;
  let error: unknown = null;
  try {
    result = await listResults({ page, perPage: PER_PAGE, period, tournamentId, now });
  } catch (e) {
    error = e;
  }

  const href = (p: { periodo?: ResultPeriod; page?: number }) =>
    qs("/esports/results", {
      periodo: (p.periodo ?? period) === "30d" ? undefined : (p.periodo ?? period),
      campeonato: tournamentId,
      page: p.page && p.page > 1 ? p.page : undefined,
    });

  const totalPages = result?.total != null ? Math.max(1, Math.ceil(result.total / PER_PAGE)) : null;
  const hasNext = result ? (totalPages ? page < totalPages : result.items.length >= PER_PAGE) : false;

  // Campeonato selecionado (nome vindo dos próprios resultados, se houver).
  const fromResults = tournamentId ? result?.items.find((m) => m.tournament?.id === tournamentId) : undefined;
  const selected = tournamentId
    ? {
        value: String(tournamentId),
        label: fromResults?.tournament
          ? tournamentTitle({ league: fromResults.league, serie: fromResults.serie, name: fromResults.tournament.name })
          : `Campeonato #${tournamentId}`,
      }
    : null;

  return (
    <>
      <EsportsHeader
        title="Resultados"
        description="Placares finais confirmados, do mais recente para o mais antigo."
        stats={[{ label: period === "all" ? "Finalizadas" : `Em ${PERIOD_LABEL[period]}`, value: result?.total }]}
        controls={
          <>
            <Chips
              label="Período"
              items={RESULT_PERIODS.map((p) => ({ key: p, label: PERIOD_LABEL[p], href: href({ periodo: p, page: 1 }), active: p === period }))}
            />
            {/* A lista de campeonatos é pesada na API: carrega em paralelo, sem
                segurar os resultados (o select básico aparece na hora). */}
            <Suspense fallback={<TournamentSelect selected={selected} options={[]} />}>
              <TournamentFilter selected={selected} />
            </Suspense>
          </>
        }
      />

      {error ? (
        <EsportsErrorState error={error} />
      ) : !result || result.items.length === 0 ? (
        <EsportsState title="Nenhum resultado no período" description="Não encontramos partidas de CS2 finalizadas com esses filtros." />
      ) : (
        <>
          <div className="esports-list">
            {result.items.map((m) => (
              <MatchCard key={m.id} match={m} tz={tz} now={now} showDate />
            ))}
          </div>
          <Pagination page={page} hasNext={hasNext} totalPages={totalPages} href={(p) => href({ page: p })} />
        </>
      )}
    </>
  );
}

type Option = { value: string; label: string };

function TournamentSelect({ selected, options }: { selected: Option | null; options: Option[] }) {
  const all = selected && !options.some((o) => o.value === selected.value) ? [selected, ...options] : options;
  return (
    <Suspense>
      <ParamSelect
        name="campeonato"
        label="Filtrar por campeonato"
        icon="filter"
        defaultValue=""
        options={[{ value: "", label: "Todos os campeonatos" }, ...all]}
      />
    </Suspense>
  );
}

async function TournamentFilter({ selected }: { selected: Option | null }) {
  const tournaments = await listTournamentOptions().catch(() => []);
  return (
    <TournamentSelect
      selected={selected}
      options={tournaments.map((t) => ({ value: String(t.id), label: tournamentTitle(t) }))}
    />
  );
}
