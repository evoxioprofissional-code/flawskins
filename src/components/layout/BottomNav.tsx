"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  Gift,
  LayoutGrid,
  Menu,
  Plus,
  Tag,
  Ticket,
  Trophy,
  User,
  UsersRound,
  X,
} from "lucide-react";

import { WHATSAPP_COMUNIDADE } from "@/lib/whatsapp";

type Item = { href: string; label: string; Icon: typeof LayoutGrid; externo?: boolean };

// Barra inferior (mobile): atalhos principais + "Mais" com TODAS as opções
// do header (que fica escondido no celular).
const BARRA: Item[] = [
  { href: "/", label: "Market", Icon: LayoutGrid },
  { href: "/esports", label: "E-Sports", Icon: Trophy },
];
const BARRA_DIREITA: Item[] = [{ href: "/rifas", label: "Rifas", Icon: Gift }];

const MENU: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Navegar",
    itens: [
      { href: "/", label: "Market", Icon: LayoutGrid },
      { href: "/novo", label: "Vender", Icon: Tag },
      { href: "/perfil#inventario", label: "Inventário", Icon: BriefcaseBusiness },
      { href: "/rifas", label: "Rifas", Icon: Gift },
      { href: "/esports", label: "E-Sports", Icon: Trophy },
      { href: WHATSAPP_COMUNIDADE, label: "Comunidade", Icon: UsersRound, externo: true },
    ],
  },
  {
    titulo: "Sua conta",
    itens: [
      { href: "/perfil", label: "Meu perfil", Icon: User },
      { href: "/rifas/minhas", label: "Minhas rifas", Icon: Ticket },
      { href: "/alertas", label: "Alertas", Icon: Bell },
    ],
  },
];

function ativo(path: string, href: string) {
  const rota = href.split("#")[0];
  if (rota === "/") return path === "/" || path.startsWith("/skin/");
  return path === rota || path.startsWith(`${rota}/`);
}

export function BottomNav() {
  const path = usePathname();
  const [aberto, setAberto] = useState(false);

  // Fecha ao trocar de página; trava o scroll e fecha com Esc enquanto aberto.
  useEffect(() => setAberto(false), [path]);
  useEffect(() => {
    if (!aberto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  return (
    <>
      <nav aria-label="Navegação principal" className="mobile-nav">
        {BARRA.map((i) => (
          <NavButton key={i.href} item={i} active={!aberto && ativo(path, i.href)} />
        ))}

        <Link href="/novo" aria-label="Vender uma skin" className="mobile-nav-fab">
          <Plus aria-hidden="true" />
        </Link>

        {BARRA_DIREITA.map((i) => (
          <NavButton key={i.href} item={i} active={!aberto && ativo(path, i.href)} />
        ))}

        <button
          type="button"
          className="mobile-nav-item"
          data-active={aberto}
          aria-expanded={aberto}
          aria-controls="mobile-menu"
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          <span>Mais</span>
        </button>
      </nav>

      <div className="mobile-menu-backdrop" data-open={aberto} onClick={() => setAberto(false)} aria-hidden="true" />
      <div id="mobile-menu" className="mobile-menu" data-open={aberto} role="dialog" aria-modal="true" aria-label="Menu" inert={!aberto}>
        <span className="mobile-menu-handle" aria-hidden="true" />
        {MENU.map((sec) => (
          <section key={sec.titulo}>
            <p className="mobile-menu-title">{sec.titulo}</p>
            <ul>
              {sec.itens.map((i) => (
                <li key={i.label}>
                  {i.externo ? (
                    <a href={i.href} target="_blank" rel="noopener noreferrer" className="mobile-menu-link">
                      <i.Icon aria-hidden="true" />
                      <span>{i.label}</span>
                      <ChevronRight aria-hidden="true" />
                    </a>
                  ) : (
                    <Link
                      href={i.href}
                      className="mobile-menu-link"
                      data-active={ativo(path, i.href) && !i.href.includes("#")}
                      onClick={() => setAberto(false)}
                    >
                      <i.Icon aria-hidden="true" />
                      <span>{i.label}</span>
                      <ChevronRight aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function NavButton({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link href={item.href} className="mobile-nav-item" data-active={active} aria-current={active ? "page" : undefined}>
      <item.Icon aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}
