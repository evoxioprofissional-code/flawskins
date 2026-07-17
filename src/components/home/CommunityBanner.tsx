import { ArrowRight } from "lucide-react";

import { WHATSAPP_COMUNIDADE } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";

// CTA de comunidade — card escuro com borda em gradiente girando (aurora).
export function CommunityBanner() {
  return (
    <section className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="relative overflow-hidden rounded-3xl shadow-[0_0_70px_-20px] shadow-fuchsia-500/50">
          {/* Borda animada: gradiente cônico girando atrás do card */}
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 h-[320%] w-[150%] -translate-x-1/2 -translate-y-1/2 animate-[spin_9s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,#7c3aed_60deg,#d946ef_120deg,transparent_200deg,transparent_360deg)] opacity-80"
          />

          {/* Card interno (deixa ~2px da borda animada aparecer) */}
          <div className="relative m-0.5 rounded-[calc(1.5rem-2px)] bg-zinc-950 p-7 sm:p-9">
            {/* Brilho interno + glifo decorativo */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_0%_0%,rgba(124,58,237,0.22),transparent_55%)]" />
            <WhatsAppIcon className="pointer-events-none absolute -right-8 -bottom-10 size-56 text-white/[0.04]" />

            <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200 backdrop-blur">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Comunidade oficial
                </span>
                <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Entre no grupo da Vision Skins
                </h2>
                <p className="mt-2 text-sm text-zinc-300 sm:text-base">
                  Skins novas, negócios e rifas em primeira mão — e troca de ideia
                  com quem joga. É de graça.
                </p>
              </div>

              <a
                href={WHATSAPP_COMUNIDADE}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-neutral-800 ring-1 ring-white/10 hover:bg-neutral-700 px-6 text-sm font-bold text-violet-300 transition-all hover:-translate-y-0.5"
              >
                <WhatsAppIcon className="size-5" />
                Entrar na comunidade
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
