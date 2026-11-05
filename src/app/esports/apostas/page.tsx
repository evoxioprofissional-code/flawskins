import Image from "next/image";
import { CalendarClock, Lock, Radio, Swords, Trophy } from "lucide-react";

import { TeamLogo } from "@/components/esports/bits";
import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";
import { formatTime, relativeDayLabel } from "@/lib/esports/datetime";
import { getMatchCounts, getViewerTimeZone, listMatches } from "@/lib/esports/service";
import type { Match } from "@/lib/esports/types";
import { WHATSAPP_COMUNIDADE } from "@/lib/whatsapp";

// Apostas P2P — vitrine BLOQUEADA. Os usuários entram e veem como vai ser,
// mas nada aqui cria, aceita ou processa aposta: todos os controles estão
// desativados e não existe backend de apostas. As partidas da prévia são
// reais (PandaScore); não exibimos odds nem valores inventados.

const PASSOS = [
  {
    titulo: "Escolha a partida",
    texto: "Partidas oficiais de CS2, com times, horários e campeonatos vindos da fonte de dados.",
  },
  {
    titulo: "Desafie a comunidade",
    texto: "Você escolhe um lado e abre o desafio. Outro jogador aceita o lado oposto.",
  },
  {
    titulo: "O resultado oficial decide",
    texto: "Quando a partida termina, o placar oficial define o vencedor do desafio.",
  },
] as const;

const PILARES = [
  { titulo: "Jogador contra jogador", texto: "Sem banca do outro lado: os desafios são entre membros da comunidade." },
  { titulo: "Tudo transparente", texto: "Cada desafio mostra a partida, os lados escolhidos e o resultado oficial." },
  { titulo: "Feito com cuidado", texto: "Só abrimos quando estiver seguro e dentro das regras. Até lá, fica bloqueado." },
] as const;

export default async function ApostasP2PPage() {
  const tz = await getViewerTimeZone();
  const now = new Date();
  const [counts, proximas] = await Promise.all([
    getMatchCounts({ tz, now }),
    listMatches({ filter: "upcoming", perPage: 6, tz, now })
      .then((r) => r.items.filter((m) => m.sides.every((s) => s.team)).slice(0, 3))
      .catch(() => [] as Match[]),
  ]);

  return (
    <div className="bet">
      {/* ---------- HERO ---------- */}
      <section className="bet-hero" aria-labelledby="bet-title">
        <div className="bet-hero-bg" aria-hidden="true">
          <span className="bet-grid" />
          <span className="bet-glow bet-glow-a" />
          <span className="bet-glow bet-glow-b" />
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="bet-spark"
              style={{
                left: `${(i * 37 + 5) % 100}%`,
                top: `${(i * 53 + 11) % 92}%`,
                animationDelay: `${(i % 7) * 0.7}s`,
                animationDuration: `${5 + (i % 4)}s`,
              }}
            />
          ))}
        </div>

        <div className="bet-hero-copy">
          <p className="bet-eyebrow">
            <span>Cloud E-Sports</span>
            <span>Em breve</span>
          </p>
          <h1 id="bet-title" className="bet-title">
            Apostas
            <span>P2P</span>
          </h1>
          <p className="bet-lead">
            Desafie outros jogadores nas partidas reais de CS2. Você escolhe o lado, a comunidade aceita, e o
            resultado oficial decide.
          </p>

          <div className="bet-actions">
            <button type="button" className="bet-btn-locked" disabled aria-disabled="true" title="Disponível em breve">
              <Lock aria-hidden="true" />
              Criar desafio
            </button>
            <a href={WHATSAPP_COMUNIDADE} target="_blank" rel="noopener noreferrer" className="bet-btn-ghost">
              <WhatsAppIcon className="size-4" />
              Quero ser avisado
            </a>
          </div>

          <dl className="bet-stats">
            {typeof counts.live === "number" && (
              <div data-tone="live">
                <dt>Ao vivo agora</dt>
                <dd>{counts.live}</dd>
              </div>
            )}
            {typeof counts.today === "number" && (
              <div>
                <dt>Partidas hoje</dt>
                <dd>{counts.today}</dd>
              </div>
            )}
            {typeof counts.upcoming === "number" && (
              <div>
                <dt>Agendadas</dt>
                <dd>{counts.upcoming.toLocaleString("pt-BR")}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bet-hero-art" aria-hidden="true">
          <span className="bet-orbit bet-orbit-1" />
          <span className="bet-orbit bet-orbit-2" />
          <span className="bet-orbit bet-orbit-3" />
          <span className="bet-mascot">
            <Image src="/esports/mascote.webp" alt="" width={1536} height={1024} sizes="(max-width: 760px) 451px, 636px" priority />
          </span>
          <span className="bet-lockchip">
            <Lock />
          </span>
          <span className="bet-chip bet-chip-a">
            <Trophy /> CS2
          </span>
          <span className="bet-chip bet-chip-b">
            <Swords /> 1 x 1
          </span>
        </div>
      </section>

      {/* ---------- COMO VAI FUNCIONAR ---------- */}
      <section className="bet-section" aria-labelledby="bet-how">
        <div className="bet-section-head">
          <p className="bet-kicker">Como vai funcionar</p>
          <h2 id="bet-how">Três passos. Nenhuma banca.</h2>
        </div>
        <ol className="bet-steps">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="bet-step">
              <span className="bet-step-num">{i + 1}</span>
              <div>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- PRÉVIA DA ARENA (partidas reais, controles travados) ---------- */}
      {proximas.length > 0 && (
        <section className="bet-section" aria-labelledby="bet-arena">
          <div className="bet-section-head">
            <p className="bet-kicker">Prévia da arena</p>
            <h2 id="bet-arena">Próximos confrontos</h2>
            <p className="bet-section-sub">Partidas reais de CS2. Os desafios abrem quando a função for liberada.</p>
          </div>

          <div className="bet-arena">
            <div className="bet-slips">
              {proximas.map((m) => (
                <Slip key={m.id} match={m} tz={tz} now={now} />
              ))}
            </div>

            <div className="bet-arena-lock">
              <span className="bet-arena-lock-icon">
                <Lock aria-hidden="true" />
              </span>
              <strong>Arena bloqueada</strong>
              <span>Os desafios P2P ainda não estão disponíveis.</span>
            </div>
          </div>
        </section>
      )}

      {/* ---------- PILARES ---------- */}
      <section className="bet-section" aria-label="Princípios">
        <div className="bet-pillars">
          {PILARES.map((p) => (
            <div key={p.titulo} className="bet-pillar">
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="bet-legal">
        <Lock aria-hidden="true" />
        Função em desenvolvimento e bloqueada: não é possível criar, aceitar ou pagar apostas nesta página. Quando for
        lançada, será restrita a maiores de 18 anos e seguirá a legislação aplicável.
      </p>
    </div>
  );
}

function Slip({ match, tz, now }: { match: Match; tz: string; now: Date }) {
  const when = match.scheduledAt ?? match.beginAt;
  const [a, b] = match.sides;
  return (
    <article className="bet-slip">
      <header>
        <span className="bet-slip-league">
          <TeamLogo src={match.league?.logo} name={match.league?.name ?? "?"} size="sm" />
          <span>{match.league?.name ?? "Campeonato"}</span>
        </span>
        <span className="bet-slip-when">
          {match.status === "live" ? (
            <>
              <Radio aria-hidden="true" /> Ao vivo
            </>
          ) : (
            <>
              <CalendarClock aria-hidden="true" />
              {when ? `${relativeDayLabel(when, now, tz)} · ${formatTime(when, tz)}` : "A definir"}
            </>
          )}
          {match.format.label && <em>{match.format.label}</em>}
        </span>
      </header>

      <div className="bet-slip-teams">
        <div className="bet-slip-team">
          <TeamLogo src={a.team?.logo} name={a.team?.name ?? "?"} size="lg" />
          <strong>{a.team?.name}</strong>
        </div>
        <span className="bet-slip-vs">VS</span>
        <div className="bet-slip-team">
          <TeamLogo src={b.team?.logo} name={b.team?.name ?? "?"} size="lg" />
          <strong>{b.team?.name}</strong>
        </div>
      </div>

      <div className="bet-slip-picks">
        <button type="button" disabled aria-disabled="true">
          <Lock aria-hidden="true" /> {a.team?.acronym || a.team?.name}
        </button>
        <button type="button" disabled aria-disabled="true">
          <Lock aria-hidden="true" /> {b.team?.acronym || b.team?.name}
        </button>
      </div>
    </article>
  );
}
