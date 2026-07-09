import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

// Posições/tempos das skins flutuantes (só desktop, decorativo).
const FLOAT_SPOTS = [
  { className: "right-[4%] top-[12%] w-40", dur: "7s", delay: "0s", rot: "-8deg", op: "opacity-90" },
  { className: "right-[24%] top-[46%] w-28", dur: "8.5s", delay: "0.6s", rot: "6deg", op: "opacity-70" },
  { className: "right-[13%] bottom-[8%] w-36", dur: "6.5s", delay: "1.2s", rot: "-4deg", op: "opacity-80" },
  { className: "right-[40%] top-[16%] w-24", dur: "9s", delay: "0.3s", rot: "10deg", op: "opacity-50" },
  { className: "right-[45%] bottom-[14%] w-20", dur: "7.8s", delay: "1.6s", rot: "-12deg", op: "opacity-40" },
] as const;

export function Hero({ total, skins = [] }: { total: number; skins?: string[] }) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-800/70">
      {/* Fundo: gradientes de marca + campo de estrelas */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_15%_-20%,rgba(124,58,237,0.30),transparent_60%),radial-gradient(70%_110%_at_100%_0%,rgba(217,70,239,0.22),transparent_55%)]" />
      <div className="starfield pointer-events-none absolute inset-0 opacity-70" />

      {/* Skins flutuando (desktop) */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        {skins.map((src, i) => {
          const spot = FLOAT_SPOTS[i];
          if (!spot) return null;
          return (
            <div
              key={src + i}
              className={`animate-floaty absolute ${spot.className} ${spot.op}`}
              style={
                { "--dur": spot.dur, "--delay": spot.delay, "--rot": spot.rot } as React.CSSProperties
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="w-full drop-shadow-[0_20px_35px_rgba(124,58,237,0.35)]"
              />
            </div>
          );
        })}
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200 backdrop-blur">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
          {total > 0
            ? `${total} skin${total === 1 ? "" : "s"} à venda agora`
            : "Classificados P2P de CS2"}
        </span>

        <h1 className="font-display mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-zinc-50 sm:text-5xl lg:text-6xl">
          Suas skins de CS2,{" "}
          <span
            className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300 bg-clip-text text-transparent"
            style={{ filter: "drop-shadow(0 0 28px rgba(192,132,252,0.45))" }}
          >
            direto com o vendedor
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-base text-zinc-300 sm:text-lg">
          Importe seu inventário da Steam, publique em segundos e feche no
          WhatsApp. Sem taxa pra comprar, sem intermediário travando o negócio.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="#skins"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition-all hover:-translate-y-0.5 hover:shadow-fuchsia-500/40"
          >
            Ver skins <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/novo"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-6 text-sm font-semibold text-zinc-100 backdrop-blur transition-colors hover:bg-zinc-800"
          >
            Vender minha skin
          </Link>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
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
