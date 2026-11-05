import { EsportsState, TeamLogo } from "@/components/esports/bits";
import { EsportsHeader } from "@/components/esports/EsportsHeader";
import { formatDate } from "@/lib/esports/datetime";
import { getTeamRanking } from "@/lib/esports/ranking";
import { getViewerTimeZone } from "@/lib/esports/service";

// Ranking só é exibido quando houver um provedor real e autorizado
// registrado em src/lib/esports/ranking.ts. Sem provedor: estado vazio.
export default async function RankingPage() {
  const [ranking, tz] = await Promise.all([getTeamRanking("cs2"), getViewerTimeZone()]);

  return (
    <>
      <EsportsHeader title="Ranking" description="Classificação de equipes de fonte oficial e verificável." />

      {!ranking ? (
        <EsportsState
          title="Ranking de equipes em preparação."
          description="Vamos publicar o ranking assim que houver uma fonte oficial e confiável de classificação."
        />
      ) : (
        <section className="esports-panel">
          <div className="esports-panel-head">
            Fonte: {ranking.source}
            <span>Atualizado em {formatDate(ranking.updatedAt, tz)}</span>
          </div>
          <ol className="esports-rows">
            {ranking.entries.map((e) => (
              <li key={`${e.position}-${e.team.name}`} className="esports-row">
                <span className="w-8 text-right font-bold tabular-nums text-white">{e.position}</span>
                <TeamLogo src={e.team.logo} name={e.team.name} />
                <span className="min-w-0 flex-1 truncate">{e.team.name}</span>
                {e.points != null && <span className="tabular-nums text-zinc-400">{e.points} pts</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
