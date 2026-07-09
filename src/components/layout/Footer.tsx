import Link from "next/link";

import { Logo } from "@/components/layout/Logo";

export function Footer() {
  return (
    <footer className="hidden border-t border-zinc-800/80 bg-zinc-950 md:block">
      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm text-zinc-400">
              O classificado P2P de skins de CS2 da comunidade. Anuncie em
              segundos e feche direto no WhatsApp.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <FooterLink href="/">Comprar skins</FooterLink>
            <FooterLink href="/novo">Vender skin</FooterLink>
            <FooterLink href="/rifas">Rifas</FooterLink>
            <FooterLink href="/arena">Arena</FooterLink>
            <FooterLink href="/categorias">Categorias</FooterLink>
            <FooterLink href="/perfil">Meu perfil</FooterLink>
          </nav>
        </div>

        <div className="mt-8 border-t border-zinc-900 pt-5 text-xs text-zinc-600">
          <p className="max-w-3xl">
            A Vision Skins é um classificado. As negociações acontecem direto
            entre comprador e vendedor pelo WhatsApp — a plataforma não
            intermedeia pagamentos nem se responsabiliza pelas transações.
            Negocie com cautela.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} Vision Skins</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-zinc-400 transition-colors hover:text-zinc-100">
      {children}
    </Link>
  );
}
