"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, ChartNoAxesColumn, CircleCheck, HandCoins, Lock, Trophy } from "lucide-react";

type Item = {
  href: string;
  label: string;
  hint: string;
  Icon: typeof Trophy;
  match: (path: string) => boolean;
  badge?: { value: number; tone: "live" | "neutral"; title: string } | null;
};

// Navegação do E-Sports (parte client: só o estado ativo depende da rota).
export function EsportsNav({ liveCount, runningTournaments }: { liveCount: number | null; runningTournaments: number | null }) {
  const path = usePathname();

  const items: Item[] = [
    {
      href: "/esports",
      label: "Partidas",
      hint: "Ao vivo e agenda",
      Icon: CalendarClock,
      match: (p) => p === "/esports" || p.startsWith("/esports/matches"),
      badge: liveCount ? { value: liveCount, tone: "live", title: `${liveCount} ao vivo agora` } : null,
    },
    {
      href: "/esports/results",
      label: "Resultados",
      hint: "Partidas finalizadas",
      Icon: CircleCheck,
      match: (p) => p.startsWith("/esports/results"),
    },
    {
      href: "/esports/tournaments",
      label: "Campeonatos",
      hint: "Ligas e torneios",
      Icon: Trophy,
      match: (p) => p.startsWith("/esports/tournaments"),
      badge: runningTournaments
        ? { value: runningTournaments, tone: "neutral", title: `${runningTournaments} em andamento` }
        : null,
    },
    {
      href: "/esports/ranking",
      label: "Ranking",
      hint: "Classificação de equipes",
      Icon: ChartNoAxesColumn,
      match: (p) => p.startsWith("/esports/ranking"),
    },
  ];

  return (
    <nav aria-label="E-Sports">
      <p className="esports-side-label">Competições</p>
      <ul className="esports-side-list">
        {items.map((item) => {
          const active = item.match(path);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="esports-nav-item"
                data-active={active}
                aria-current={active ? "page" : undefined}
              >
                <span className="esports-nav-icon">
                  <item.Icon aria-hidden="true" />
                </span>
                <span className="esports-nav-text">
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                {item.badge && (
                  <span className="esports-nav-badge" data-tone={item.badge.tone} title={item.badge.title}>
                    {item.badge.value}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="esports-side-label">Comunidade</p>
      <ul className="esports-side-list">
        <li>
          {/* Apostas: apenas indicação. Nenhuma funcionalidade de aposta existe. */}
          <span className="esports-nav-item" aria-disabled="true" title="Em breve">
            <span className="esports-nav-icon">
              <HandCoins aria-hidden="true" />
            </span>
            <span className="esports-nav-text">
              <strong>Apostas P2P</strong>
              <small>Em breve na Cloud</small>
            </span>
            <Lock className="esports-nav-lock" aria-hidden="true" />
          </span>
        </li>
      </ul>
    </nav>
  );
}
