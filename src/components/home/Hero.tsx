import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

// Faixa full-width com a proposta de valor + CTAs. Ocupa a largura toda,
// então telas grandes não ficam com aquele vazio nas laterais.
export function Hero({ total }: { total: number }) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-800/70">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_15%_-20%,rgba(124,58,237,0.28),transparent_60%),radial-gradient(70%_110%_at_100%_0%,rgba(217,70,239,0.20),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          {total > 0
            ? `${total} skin${total === 1 ? "" : "s"} à venda agora`
            : "Classificados P2P de CS2"}
        </span>

        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight text-zinc-50 sm:text-4xl lg:text-5xl">
          Suas skins de CS2, negociadas{" "}
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            direto com o vendedor
          </span>
        </h1>

        <p className="mt-4 max-w-xl text-base text-zinc-300 sm:text-lg">
          Importe seu inventário da Steam, publique em segundos e feche no
          WhatsApp. Sem taxa pra comprar, sem intermediário travando o negócio.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="#skins"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition-opacity hover:opacity-90"
          >
            Ver skins <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/novo"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-6 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800"
          >
            Vender minha skin
          </Link>
        </div>

        <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
          {[
            "Sem taxa para comprar",
            "Importe da Steam em 1 clique",
            "Negocie direto no WhatsApp",
          ].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <Check className="size-4 text-emerald-400" /> {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
