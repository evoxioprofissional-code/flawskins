export function Footer() {
  return (
    <footer className="hidden border-t border-zinc-800/80 bg-zinc-950 md:block">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-zinc-500">
        <p>
          FlawSkins é um classificado P2P. As negociações acontecem direto entre
          comprador e vendedor pelo WhatsApp — a plataforma não intermedeia
          pagamentos nem se responsabiliza pelas transações. Negocie com
          cautela.
        </p>
        <p className="mt-2 text-zinc-600">
          © {new Date().getFullYear()} FlawSkins
        </p>
      </div>
    </footer>
  );
}
