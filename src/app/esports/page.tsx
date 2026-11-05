import { Suspense } from "react";

import { Chips, EsportsErrorState, EsportsState, Pagination, intParam, qs, strParam } from "@/components/esports/bits";
import { EsportsHeader, tzDescription } from "@/components/esports/EsportsHeader";
import { MatchList } from "@/components/esports/MatchCard";
import { ParamSelect } from "@/components/esports/ParamSelect";
import {
  MATCH_FILTERS,
  getMatchCounts,
  getViewerTimeZone,
  listMatches,
  type MatchFilter,
  type SortDir,
} from "@/lib/esports/service";
import type { Match, Paginated } from "@/lib/esports/types";

const FILTER_LABEL: Record<MatchFilter, string> = {
  all: "Todas",
  live: "Ao vivo",
  today: "Hoje",
  tomorrow: "Amanhã",
  upcoming: "Próximas",
  finished: "Finalizadas",
};

const EMPTY: Record<MatchFilter, [string, string]> = {
  all: ["Nenhuma partida programada", "Não há partidas de CS2 ao vivo ou agendadas no momento."],
  live: ["Nenhuma partida ao vivo", "Assim que uma partida de CS2 começar, ela aparece aqui."],
  today: ["Sem partidas hoje", "Não há partidas de CS2 programadas para hoje."],
  tomorrow: ["Sem partidas amanhã", "Ainda não há partidas de CS2 programadas para amanhã."],
  upcoming: ["Nenhuma partida agendada", "Não há próximas partidas de CS2 publicadas no momento."],
  finished: ["Nenhum resultado", "Não encontramos partidas finalizadas."],
};

const PER_PAGE = 20;

export default async function EsportsMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; ordem?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = strParam(sp.filtro, MATCH_FILTERS, "all");
  const defaultSort: SortDir = filter === "finished" ? "desc" : "asc";
  const sort = strParam(sp.ordem, ["asc", "desc"] as const, defaultSort);
  const page = intParam(sp.page);
  const tz = await getViewerTimeZone();
  const now = new Date();

  let result: Paginated<Match> | null = null;
  let error: unknown = null;
  const [res, counts] = await Promise.all([
    listMatches({ filter, page, perPage: PER_PAGE, sort, tz, now }).then(
      (r) => ({ ok: true as const, r }),
      (e: unknown) => ({ ok: false as const, e }),
    ),
    getMatchCounts({ tz, now }),
  ]);
  if (res.ok) result = res.r;
  else error = res.e;

  const href = (params: { filtro?: MatchFilter; ordem?: SortDir; page?: number }) =>
    qs("/esports", {
      filtro: (params.filtro ?? filter) === "all" ? undefined : (params.filtro ?? filter),
      ordem: params.ordem && params.ordem !== defaultSort ? params.ordem : undefined,
      page: params.page && params.page > 1 ? params.page : undefined,
    });

  const totalPages = result?.total != null ? Math.max(1, Math.ceil(result.total / PER_PAGE)) : null;
  const hasNext = result ? (totalPages ? page < totalPages : result.items.length >= PER_PAGE) : false;
  const newestFirst = filter === "finished";

  return (
    <>
      <EsportsHeader
        title="Partidas"
        description={`Jogos ao vivo, agenda e placares em tempo real · ${tzDescription(tz)}`}
        stats={[
          { label: "Ao vivo", value: counts.live, tone: "live" },
          { label: "Hoje", value: counts.today },
          { label: "Agendadas", value: counts.upcoming },
        ]}
        controls={
          <>
            <Chips
              label="Filtrar partidas"
              items={MATCH_FILTERS.map((f) => ({
                key: f,
                label: FILTER_LABEL[f],
                href: href({ filtro: f, page: 1 }),
                active: f === filter,
                live: f === "live" && Boolean(counts.live),
              }))}
            />
            <Suspense>
              <ParamSelect
                name="ordem"
                label="Ordenar por data"
                defaultValue={defaultSort}
                options={
                  newestFirst
                    ? [
                        { value: "desc", label: "Mais recentes primeiro" },
                        { value: "asc", label: "Mais antigas primeiro" },
                      ]
                    : [
                        { value: "asc", label: "Mais próximas primeiro" },
                        { value: "desc", label: "Mais distantes primeiro" },
                      ]
                }
              />
            </Suspense>
          </>
        }
      />

      {error ? (
        <EsportsErrorState error={error} />
      ) : !result || result.items.length === 0 ? (
        <EsportsState title={EMPTY[filter][0]} description={EMPTY[filter][1]} />
      ) : (
        <>
          <MatchList matches={result.items} tz={tz} now={now} />
          <Pagination page={page} hasNext={hasNext} totalPages={totalPages} href={(p) => href({ page: p, ordem: sort })} />
        </>
      )}
    </>
  );
}
