import { SteamIcon } from "@/components/auth/SteamIcon";

// Botão "Entrar com Steam" — leva pro fluxo OpenID no servidor.
export function SteamButton({ next = "/" }: { next?: string }) {
  return (
    <a
      href={`/api/steam/login?next=${encodeURIComponent(next)}`}
      className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#1b2838] to-[#2a475e] text-base font-semibold text-white ring-1 ring-white/10 transition-opacity hover:opacity-90"
    >
      <SteamIcon className="size-5" />
      Entrar com Steam
    </a>
  );
}
