import Link from "next/link";
import { PackageOpen, Swords, Ticket, ArrowRight } from "lucide-react";

// Faixa de diferenciais: o que separa a Vision de um grupo de WhatsApp.
const FEATURES = [
  {
    href: "/novo",
    icon: PackageOpen,
    titulo: "Importe da Steam",
    desc: "Conecte sua conta e anuncie suas skins em 1 clique, já com o float.",
    cor: "text-sky-300",
    anel: "group-hover:border-sky-500/50",
  },
  {
    href: "/arena",
    icon: Swords,
    titulo: "Vision Arena",
    desc: "Treine a mira, suba de patente e apareça no ranking da comunidade.",
    cor: "text-violet-300",
    anel: "group-hover:border-violet-500/50",
  },
  {
    href: "/rifas",
    icon: Ticket,
    titulo: "Rifas de skins",
    desc: "Concorra a skins na sorte — ou crie a sua própria rifa e divulgue.",
    cor: "text-fuchsia-300",
    anel: "group-hover:border-fuchsia-500/50",
  },
] as const;

export function FeatureStrip() {
  return (
    <section className="border-t border-zinc-800/70 bg-zinc-950">
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
              className={cnBase(f.anel)}
            >
              <f.icon className={`size-6 ${f.cor}`} />
              <h3 className="mt-3 flex items-center gap-1.5 text-base font-semibold text-zinc-100">
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

function cnBase(anel: string) {
  return `group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors ${anel}`;
}
