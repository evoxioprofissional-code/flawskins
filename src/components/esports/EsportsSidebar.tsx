import Image from "next/image";
import Link from "next/link";

import { EsportsNav } from "@/components/esports/EsportsNav";
import { TeamLogo } from "@/components/esports/bits";
import { listMatches, listTournaments } from "@/lib/esports/service";
import type { Match } from "@/lib/esports/types";

const LIVE_PREVIEW = 4;

function short(m: Match, i: 0 | 1) {
  const t = m.sides[i].team;
  return t ? (t.acronym || t.name) : "A definir";
}

// Sidebar do E-Sports: cabeçalho, navegação com contagens reais e um resumo
// das partidas ao vivo. Se a API falhar, a navegação continua funcionando.
export async function EsportsSidebar() {
  const [live, running] = await Promise.allSettled([
    listMatches({ filter: "live", perPage: 50 }),
    listTournaments({ phase: "running", perPage: 1 }),
  ]);
  const liveMatches = live.status === "fulfilled" ? live.value.items : null;
  const runningTotal = running.status === "fulfilled" ? running.value.total : null;

  return (
    <div className="esports-side">
      <div className="esports-side-head">
        {/* O arquivo do mascote tem bastante margem; o wrapper recorta a nuvem. */}
        <span className="esports-side-mascot" aria-hidden="true">
          <Image src="/esports/mascote.webp" alt="" width={1536} height={1024} />
        </span>
        <div className="min-w-0">
          <strong>Cloud E-Sports</strong>
          <small>Central competitiva</small>
        </div>
      </div>

      <EsportsNav liveCount={liveMatches?.length ?? null} runningTournaments={runningTotal} />

      <section className="esports-side-live" aria-label="Ao vivo agora">
        <p className="esports-side-label">
          <span className="esports-side-dot" data-on={Boolean(liveMatches?.length)} />
          Ao vivo agora
        </p>
        {liveMatches === null ? (
          <p className="esports-side-empty">Indisponível no momento.</p>
        ) : liveMatches.length === 0 ? (
          <p className="esports-side-empty">Nenhuma partida ao vivo.</p>
        ) : (
          <ul className="grid gap-1">
            {liveMatches.slice(0, LIVE_PREVIEW).map((m) => (
              <li key={m.id}>
                <Link href={`/esports/matches/${m.id}`} className="esports-side-match" title={m.name}>
                  <span className="esports-side-team">
                    <TeamLogo src={m.sides[0].team?.logo} name={short(m, 0)} size="sm" />
                    <span>{short(m, 0)}</span>
                    <b>{m.sides[0].score ?? "-"}</b>
                  </span>
                  <span className="esports-side-team">
                    <TeamLogo src={m.sides[1].team?.logo} name={short(m, 1)} size="sm" />
                    <span>{short(m, 1)}</span>
                    <b>{m.sides[1].score ?? "-"}</b>
                  </span>
                </Link>
              </li>
            ))}
            {liveMatches.length > LIVE_PREVIEW && (
              <li>
                <Link href="/esports?filtro=live" className="esports-side-more">
                  Ver todas ({liveMatches.length})
                </Link>
              </li>
            )}
          </ul>
        )}
      </section>

      <p className="esports-side-foot">Dados em tempo real · PandaScore</p>
    </div>
  );
}
