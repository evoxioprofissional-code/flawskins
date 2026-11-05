import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";

import { EsportsErrorState, StatusBadge, TeamLogo, statusLabel } from "@/components/esports/bits";
import { MatchScore, hasScore, matchDate } from "@/components/esports/MatchCard";
import { formatDate, formatTime, relativeDayLabel, timeZoneLabel } from "@/lib/esports/datetime";
import { getMatch, getViewerTimeZone } from "@/lib/esports/service";
import type { Match, Side } from "@/lib/esports/types";

const LANG: Record<string, string> = { pt: "Português", en: "Inglês", es: "Espanhol", ru: "Russo", fr: "Francês", de: "Alemão", pl: "Polonês" };

function teamName(m: Match, id: number | null) {
  if (!id) return null;
  return m.sides.find((s) => s.team?.id === id)?.team?.name ?? null;
}

function ScoreboardTeam({ match, side }: { match: Match; side: Side }) {
  const result =
    match.status === "finished" && match.winnerId && side.team ? (side.team.id === match.winnerId ? "win" : "loss") : undefined;
  return (
    <div className="esports-scoreboard-team" data-result={result}>
      <TeamLogo src={side.team?.logo} name={side.team?.name ?? "?"} size="lg" />
      <strong title={side.team?.name}>{side.team?.name ?? "A definir"}</strong>
      {side.team?.location && <small>{side.team.location}</small>}
    </div>
  );
}

function formatLength(seconds: number) {
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isSafeInteger(matchId) || matchId <= 0) notFound();

  const tz = await getViewerTimeZone();
  const now = new Date();

  let match: Match | null = null;
  try {
    match = await getMatch(matchId);
  } catch (e) {
    return (
      <div className="pt-5">
        <BackLink />
        <EsportsErrorState error={e} />
      </div>
    );
  }
  if (!match) notFound();

  const when = matchDate(match);
  const winner = match.status === "finished" ? teamName(match, match.winnerId) : null;
  const stage = [match.tournament?.name, match.round].filter(Boolean).join(" · ");

  const facts: [string, React.ReactNode][] = [
    ["Campeonato", match.league?.name],
    ["Temporada", match.serie?.name],
    ["Etapa", stage || null],
    ["Formato", match.format.label ? `Melhor de ${match.format.games} (${match.format.label})` : null],
    ["Data", when ? `${formatDate(when, tz)} · ${formatTime(when, tz)} (${timeZoneLabel(tz, now)})` : "A definir"],
    ["Status", statusLabel(match.status)],
    ["Vencedor", match.draw && match.status === "finished" ? "Empate" : winner],
    ["Tier", match.tournament?.tier ? match.tournament.tier.toUpperCase() : null],
    ["Região", match.tournament?.region],
    ["Modalidade", match.tournament?.type === "online" ? "Online" : match.tournament?.type === "offline" ? "Presencial (LAN)" : null],
    ["Premiação", match.tournament?.prizepool],
    ["Reagendada", match.rescheduled && match.originalScheduledAt ? `Originalmente em ${formatDate(match.originalScheduledAt, tz)} ${formatTime(match.originalScheduledAt, tz)}` : null],
  ];

  return (
    <div className="grid gap-4 pt-5">
      <BackLink />

      <section className="esports-panel" aria-label="Placar">
        <div className="esports-panel-head">
          <div className="flex min-w-0 items-center gap-2.5">
            <TeamLogo src={match.league?.logo} name={match.league?.name ?? "?"} size="sm" />
            {match.tournament ? (
              <Link href={`/esports/tournaments/${match.tournament.id}`} className="truncate hover:text-[#43a8ff]">
                {[match.league?.name, match.serie?.name].filter(Boolean).join(" · ")}
              </Link>
            ) : (
              <span className="truncate">{match.league?.name}</span>
            )}
          </div>
          <span>{stage}</span>
        </div>

        <div className="esports-scoreboard">
          <ScoreboardTeam match={match} side={match.sides[0]} />
          <div className="esports-scoreboard-center">
            <StatusBadge status={match.status} />
            <MatchScore match={match} />
            <span className="text-xs text-zinc-500">
              {when ? `${relativeDayLabel(when, now, tz)} · ${formatTime(when, tz)}` : "Data a definir"}
              {match.format.label ? ` · ${match.format.label}` : ""}
            </span>
            {match.forfeit && match.status === "finished" && <span className="text-xs text-zinc-400">Decidida por W.O.</span>}
          </div>
          <ScoreboardTeam match={match} side={match.sides[1]} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <section className="esports-panel" aria-label="Mapas">
          <div className="esports-panel-head">
            Mapas
            {match.games.length > 0 && <span>{match.games.length} {match.games.length === 1 ? "mapa" : "mapas"}</span>}
          </div>
          {match.games.length === 0 ? (
            <p className="px-4 py-5 text-sm text-zinc-400">Informações de mapas ainda não disponíveis para esta partida.</p>
          ) : (
            <div className="esports-rows">
              {match.games.map((g) => {
                const w = teamName(match, g.winnerId);
                return (
                  <div key={g.id} className="esports-row">
                    <span className="w-16 shrink-0 text-zinc-400">Mapa {g.position}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {g.status === "finished"
                        ? w
                          ? <>Vitória de <strong className="text-white">{w}</strong>{g.forfeit ? " (W.O.)" : ""}</>
                          : "Finalizado"
                        : g.status === "live"
                          ? "Em andamento"
                          : g.status === "scheduled" ? "Não iniciado" : statusLabel(g.status)}
                    </span>
                    {g.length ? <span className="text-xs text-zinc-500">{formatLength(g.length)}</span> : null}
                    <StatusBadge status={g.status} />
                  </div>
                );
              })}
            </div>
          )}
          {match.games.length > 0 && (
            <p className="border-t border-[#1d242e] px-4 py-2.5 text-xs text-zinc-500">
              Nome do mapa e placar por rounds não são fornecidos pelo plano atual da fonte de dados.
            </p>
          )}
        </section>

        <section className="esports-panel" aria-label="Informações">
          <div className="esports-panel-head">Informações</div>
          <dl className="esports-facts" style={{ gridTemplateColumns: "1fr" }}>
            {facts
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .map(([k, v], i) => (
                <div key={k} className="esports-fact" style={i === 0 ? { borderTop: 0 } : undefined}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
        </section>
      </div>

      {match.streams.length > 0 && (
        <section className="esports-panel" aria-label="Transmissões">
          <div className="esports-panel-head">Transmissões</div>
          <div className="esports-rows">
            {match.streams.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="esports-row">
                <span className="min-w-0 flex-1 truncate">{s.url.replace(/^https:\/\/(www\.)?/, "")}</span>
                <span className="text-xs text-zinc-500">
                  {[s.language ? (LANG[s.language] ?? s.language.toUpperCase()) : null, s.official ? "Oficial" : null].filter(Boolean).join(" · ")}
                </span>
                <ExternalLink className="size-4 text-zinc-500" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      )}

      {!hasScore(match) && match.status === "scheduled" && (
        <p className="text-xs text-zinc-500">O placar aparece aqui assim que a partida começar.</p>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/esports" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-white">
      <ChevronLeft className="size-4" aria-hidden="true" /> Partidas
    </Link>
  );
}
