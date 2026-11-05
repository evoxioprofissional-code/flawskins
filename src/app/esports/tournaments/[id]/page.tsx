import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { EsportsErrorState, EsportsState, TeamLogo } from "@/components/esports/bits";
import { MatchList } from "@/components/esports/MatchCard";
import { formatDate } from "@/lib/esports/datetime";
import { getTournament, getViewerTimeZone } from "@/lib/esports/service";
import type { Match, Tournament } from "@/lib/esports/types";

/** Status derivado só de dados confirmados (vencedor / partidas ao vivo). */
function tournamentStatus(t: Tournament, matches: Match[]): string | null {
  if (t.winnerId) return "Encerrado";
  if (matches.some((m) => m.status === "live")) return "Em andamento";
  if (matches.length > 0 && matches.every((m) => m.status === "scheduled")) return "Não iniciado";
  if (matches.length > 0 && matches.every((m) => m.status === "finished" || m.status === "canceled")) return "Partidas encerradas";
  return null;
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentId = Number(id);
  if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) notFound();

  const tz = await getViewerTimeZone();
  const now = new Date();

  let data: Awaited<ReturnType<typeof getTournament>> = null;
  try {
    data = await getTournament(tournamentId);
  } catch (e) {
    return (
      <div className="pt-5">
        <BackLink />
        <EsportsErrorState error={e} />
      </div>
    );
  }
  if (!data) notFound();

  const { tournament: t, matches } = data;
  const status = tournamentStatus(t, matches);
  const winner = t.winnerId ? t.teams.find((x) => x.id === t.winnerId) : null;

  const facts: [string, string | null | undefined][] = [
    ["Liga", t.league?.name],
    ["Temporada", t.serie?.name],
    ["Etapa", t.name],
    ["Início", t.beginAt ? formatDate(t.beginAt, tz) : null],
    ["Término", t.endAt ? formatDate(t.endAt, tz) : null],
    ["Status", status],
    ["Campeão", winner?.name],
    ["Partidas", matches.length ? String(matches.length) : t.matchCount != null ? String(t.matchCount) : null],
    ["Tier", t.tier?.toUpperCase()],
    ["Região", t.region],
    ["Modalidade", t.type === "online" ? "Online" : t.type === "offline" ? "Presencial (LAN)" : null],
    ["Premiação", t.prizepool],
  ];

  return (
    <div className="grid gap-4 pt-5">
      <BackLink />

      <section className="esports-panel">
        <div className="flex items-center gap-3.5 px-4 py-4">
          <TeamLogo src={t.league?.logo} name={t.league?.name ?? t.name} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-white">
              {t.league?.name ?? "Campeonato"}
              {t.serie?.name ? ` · ${t.serie.name}` : ""}
            </h1>
            <p className="text-sm text-zinc-400">{[t.name, status].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <dl className="esports-facts">
          {facts
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="esports-fact">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
      </section>

      {t.teams.length > 0 && (
        <section className="esports-panel" aria-label="Equipes">
          <div className="esports-panel-head">
            Equipes participantes <span>{t.teams.length}</span>
          </div>
          <div className="flex flex-wrap gap-2 p-3">
            {t.teams.map((team) => (
              <span key={team.id} className="esports-tag">
                <TeamLogo src={team.logo} name={team.name} size="sm" />
                {team.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Partidas do campeonato">
        <h2 className="mb-1 mt-2 text-base font-bold text-white">Partidas</h2>
        {matches.length === 0 ? (
          <EsportsState title="Nenhuma partida publicada" description="As partidas deste campeonato ainda não foram divulgadas pela fonte de dados." />
        ) : (
          <MatchList matches={matches} tz={tz} now={now} />
        )}
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/esports/tournaments" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-white">
      <ChevronLeft className="size-4" aria-hidden="true" /> Campeonatos
    </Link>
  );
}
