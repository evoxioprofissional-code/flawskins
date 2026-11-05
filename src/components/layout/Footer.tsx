import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { WHATSAPP_COMUNIDADE } from "@/lib/whatsapp";

const COLUNAS: { titulo: string; links: { href: string; label: string; externo?: boolean }[] }[] = [
  {
    titulo: "Marketplace",
    links: [
      { href: "/", label: "Comprar skins" },
      { href: "/novo", label: "Vender skin" },
      { href: "/alertas", label: "Alertas" },
    ],
  },
  {
    titulo: "Comunidade",
    links: [
      { href: "/rifas", label: "Rifas" },
      { href: "/esports", label: "E-Sports" },
      { href: WHATSAPP_COMUNIDADE, label: "Grupo no WhatsApp", externo: true },
    ],
  },
  {
    titulo: "Sua conta",
    links: [
      { href: "/perfil", label: "Meu perfil" },
      { href: "/perfil#inventario", label: "Inventário" },
      { href: "/rifas/minhas", label: "Minhas rifas" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer hidden md:block">
      <div className="site-footer-main">
        <div className="site-footer-brand">
          <Logo mascot className="site-footer-logo" />
          <p>
            O classificado P2P de skins de CS2 da comunidade. Anuncie em segundos e feche direto no WhatsApp.
          </p>
          <a
            href={WHATSAPP_COMUNIDADE}
            target="_blank"
            rel="noopener noreferrer"
            className="site-brand site-footer-community"
            aria-label="Comunidade da Cloud no WhatsApp"
          >
            {/* O arquivo do mascote tem bastante margem; o wrapper recorta a nuvem. */}
            <span className="site-brand-mascot" aria-hidden="true">
              <Image src="/esports/mascote.webp" alt="" width={1536} height={1024} sizes="106px" />
            </span>
            <span className="site-footer-community-name">Comunidade</span>
          </a>
        </div>

        <nav className="site-footer-nav" aria-label="Rodapé">
          {COLUNAS.map((col) => (
            <div key={col.titulo}>
              <p className="site-footer-heading">{col.titulo}</p>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.externo ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.label}
                        <ArrowUpRight aria-hidden="true" />
                      </a>
                    ) : (
                      <Link href={l.href}>{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="site-footer-notice">
        <ShieldCheck aria-hidden="true" />
        <p>
          <strong>Negocie com cautela.</strong> A Cloud Skins é um classificado: as negociações acontecem direto
          entre comprador e vendedor pelo WhatsApp. A plataforma não intermedeia pagamentos nem se responsabiliza
          pelas transações.
        </p>
      </div>

      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} Cloud Skins. Todos os direitos reservados.</span>
        <span>Dados de e-sports: PandaScore</span>
      </div>
    </footer>
  );
}
