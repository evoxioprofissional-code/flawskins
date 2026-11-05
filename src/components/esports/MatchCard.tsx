import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { dayKey, formatShortDate, formatTime, relativeDayLabel } from "@/lib/esports/datetime";
import type { Match, Side } from "@/lib/esports/types";
import { StatusBadge, TeamLogo } from "@/components/esports/bits";

function sideResult(m: Match, s: Side): "win" | "loss" | undefined {
  if (m.status !== "finished" || !m.winnerId || !s.team) return undefined;
  return s.team.id === m.winnerId ? "win" : "loss";
}

/** Placar só existe para partidas ao vivo ou finalizadas com score real. */
export function hasScore(m: Match) {
  return (m.status === "live" || m.status === "finished") && m.sides.every((s) => typeof s.score === "number");
}

export function MatchScore({ match }: { match: Match }) {
  if (!hasScore(match)) {
    return (
      <span className="esports-score" data-empty="true">
        vs
      </span>
    );
  }
  const [a, b] = match.sides;
  return (
    <span className="esports-score" aria-label={`Placar ${a.score} a ${b.score}`}>
      <b data-win={sideResult(match, a) === "win"}>{a.score}</b>
      <i>:</i>
      <b data-win={sideResult(match, b) === "win"}>{b.score}</b>
    </span>
  );
}

function TeamCell({ match, side }: { match: Match; side: Side }) {
  if (!side.team) {
    return (
      <span className="esports-team" data-tbd="true">
        <TeamLogo src={null} name="?" />
        <span>A definir</span>
      </span>
    );
  }
  return (
    <span className="esports-team" data-result={sideResult(match, side)} title={side.team.name}>
      <TeamLogo src={side.team.logo} name={side.team.name} />
      <span>{side.team.name}</span>
    </span>
  );
}

/** Data de referência da partida: horário real de início, se houver, senão o agendado. */
export function matchDate(m: Match): string | null {
  return m.status === "scheduled" ? (m.scheduledAt ?? m.beginAt) : (m.beginAt ?? m.scheduledAt);
}

export function MatchCard({ match, tz, now, showDate = false }: { match: Match; tz: string; now: Date; showDate?: boolean }) {
  const when = matchDate(match);
  const stage = [match.tournament?.name, match.round].filter(Boolean).join(" · ");

  return (
    <article className="esports-match">
      <div className="esports-when">
        {match.status === "live" ? (
          <StatusBadge status="live" />
        ) : (
          <strong>{when ? formatTime(when, tz) : "--:--"}</strong>
        )}
        {match.status === "live" ? (
          when && <span className="esports-status">desde {formatTime(when, tz)}</span>
        ) : showDate && when ? (
          <span className="esports-status">{relativeDayLabel(when, now, tz)}</span>
        ) : (
          <StatusBadge status={match.status} />
        )}
      </div>

      <div className="esports-versus">
        <TeamCell match={match} side={match.sides[0]} />
        <MatchScore match={match} />
        <TeamCell match={match} side={match.sides[1]} />
      </div>

      <div className="esports-event">
        <div className="esports-event-name">
          <TeamLogo src={match.league?.logo} name={match.league?.name ?? "?"} size="sm" />
          <span>{match.league?.name ?? "Campeonato"}</span>
          {match.format.label && <span className="esports-format">{match.format.label}</span>}
        </div>
        <div className="esports-event-meta">
          {[match.serie?.name, stage].filter(Boolean).join(" · ") || " "}
        </div>
      </div>

      <Link href={`/esports/matches/${match.id}`} className="esports-button">
        Ver detalhes <ChevronRight aria-hidden="true" />
      </Link>
    </article>
  );
}

/** Lista agrupada por dia (no fuso do usuário). */
export function MatchList({ matches, tz, now }: { matches: Match[]; tz: string; now: Date }) {
  const groups: { key: string; label: string; date: string | null; items: Match[] }[] = [];
  for (const m of matches) {
    const when = matchDate(m);
    const key = m.status === "live" ? "live" : when ? dayKey(when, tz) : "tbd";
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = {
        key,
        label: key === "live" ? "Ao vivo agora" : when ? relativeDayLabel(when, now, tz) : "Data a definir",
        date: key !== "live" && when ? formatShortDate(when, tz) : null,
        items: [],
      };
      groups.push(g);
    }
    g.items.push(m);
  }

  return (
    <div>
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          <h3 className="esports-day">
            {g.label}
            {g.date && !g.label.includes(g.date) && <span>{g.date}</span>}
            <span>· {g.items.length} {g.items.length === 1 ? "partida" : "partidas"}</span>
          </h3>
          <div className="esports-list">
            {g.items.map((m) => (
              <MatchCard key={m.id} match={m} tz={tz} now={now} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
