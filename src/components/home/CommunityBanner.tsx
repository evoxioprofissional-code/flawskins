import { ArrowRight } from "lucide-react";

import { WHATSAPP_COMUNIDADE } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";

// CTA de comunidade — na paleta da marca (roxo/fúcsia), posicionado logo
// após a grade, quando o interesse do visitante está no pico.
export function CommunityBanner() {
  return (
    <section className="bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-7 shadow-[0_0_50px_-12px] shadow-fuchsia-500/40 sm:p-9">
          {/* Glifo gigante decorativo ao fundo */}
          <WhatsAppIcon className="pointer-events-none absolute -right-6 -bottom-8 size-56 text-white/10" />

          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold text-white/90">
                <span className="size-1.5 rounded-full bg-emerald-400" /> Comunidade oficial
              </span>
              <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Entre no grupo da Vision Skins
              </h2>
              <p className="mt-2 text-sm text-white/90 sm:text-base">
                Skins novas, negócios e rifas em primeira mão — e troca de ideia
                com quem joga. É de graça.
              </p>
            </div>

            <a
              href={WHATSAPP_COMUNIDADE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-violet-700 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
            >
              <WhatsAppIcon className="size-5" />
              Entrar na comunidade
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
