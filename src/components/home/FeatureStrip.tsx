import Link from "next/link";
import { Crosshair, Ticket, ArrowRight } from "lucide-react";

import { SteamIcon } from "@/components/auth/SteamIcon";

// Faixa de diferenciais: o que separa a Cloud de um grupo de WhatsApp.
// Ícones em tiles com gradiente (cheios, com presença) em vez de linha fina.
const FEATURES = [
  {
    href: "/novo",
    icon: SteamIcon,
    titulo: "Importe da Steam",
    desc: "Conecte sua conta e anuncie suas skins em 1 clique, já com o float.",
    grad: "from-sky-500 to-indigo-600",
    glow: "shadow-sky-500/30 group-hover:shadow-sky-500/50",
  },
  {
    href: "/arena",
    icon: Crosshair,
    titulo: "Cloud Arena",
    desc: "Treine a mira, suba de patente e apareça no ranking da comunidade.",
    grad: "from-blue-500 to-sky-600",
    glow: "shadow-blue-500/30 group-hover:shadow-blue-500/50",
  },
  {
    href: "/rifas",
    icon: Ticket,
    titulo: "Rifas de skins",
    desc: "Concorra a skins na sorte — ou crie a sua própria rifa e divulgue.",
    grad: "from-sky-500 to-rose-500",
    glow: "shadow-sky-500/30 group-hover:shadow-sky-500/50",
  },
] as const;

export function FeatureStrip() {
  return (
    <section className="border-t border-white/10 bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-zinc-100">
          Mais que um classificado
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Ferramentas feitas pra quem vive o CS2.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.titulo}
              href={f.href}
              className="group rounded-2xl border border-white/10 bg-neutral-900 p-5 transition-colors hover:border-white/20"
            >
              <span
                className={`grid size-12 place-items-center rounded-xl bg-gradient-to-br ${f.grad} text-white shadow-lg ${f.glow} ring-1 ring-white/15 transition-shadow`}
              >
                <f.icon className="size-6" />
              </span>
              <h3 className="mt-4 flex items-center gap-1.5 text-base font-semibold text-zinc-100">
                {f.titulo}
                <ArrowRight className="size-4 text-zinc-500 transition-transform group-hover:translate-x-0.5" />
              </h3>
              <p className="mt-1 text-sm text-zinc-400">{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
