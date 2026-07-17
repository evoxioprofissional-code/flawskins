import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

type Props = {
  total: number;
  skins?: string[];
  avatares?: string[];
  membros?: number;
};

export function Hero({ skins = [] }: Props) {
  // Duas skins compactas flutuando ao lado do título (desktop).
  const esquerda = skins[1] ?? skins[0];
  const direita = skins[2] ?? skins[3];

  return (
    <section className="relative overflow-hidden border-b border-zinc-800/70">
      {/* Fundo: gradientes de marca + estrelas */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_50%_-20%,rgba(124,58,237,0.32),transparent_62%),radial-gradient(60%_90%_at_85%_10%,rgba(217,70,239,0.20),transparent_55%)]" />
      <div className="starfield pointer-events-none absolute inset-0 opacity-70" />

      {/* Skins flutuando nas laterais do título (só desktop) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        {esquerda && (
          <FloatImg
            src={esquerda}
            className="absolute top-1/2 left-[7%] w-32 -translate-y-1/2 -rotate-6 lg:w-40"
            dur="7s"
            delay="0s"
          />
        )}
        {direita && (
          <FloatImg
            src={direita}
            className="absolute top-1/2 right-[7%] w-32 -translate-y-1/2 rotate-6 lg:w-40"
            dur="8.5s"
            delay="0.8s"
          />
        )}
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:py-16">
        <h1 className="font-impact mx-auto max-w-3xl text-4xl leading-[0.95] tracking-tight text-white uppercase sm:text-5xl lg:text-6xl">
          Skins de CS2,
          <br />
          <span
            className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300 bg-clip-text text-transparent"
            style={{ filter: "drop-shadow(0 0 32px rgba(217,70,239,0.55))" }}
          >
            direto com o vendedor
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-300 sm:text-base">
          Importe seu inventário da Steam, publique em segundos e feche no
          WhatsApp. Sem taxa pra comprar, sem intermediário travando o negócio.
        </p>

        <div className="mt-6 flex items-center justify-center">
          <Link
            href="#skins"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-800 ring-1 ring-white/10 hover:bg-neutral-700 px-6 text-sm font-semibold text-violet-300 shadow-lg shadow-fuchsia-500/30 transition-all hover:-translate-y-0.5 hover:shadow-fuchsia-500/50"
          >
            Ver skins <ArrowRight className="size-4" />
          </Link>
        </div>

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-400">
          {["Sem taxa para comprar", "Importe da Steam em 1 clique", "Negocie no WhatsApp"].map(
            (t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" /> {t}
              </li>
            )
          )}
        </ul>
      </div>
    </section>
  );
}

function FloatImg({
  src,
  className,
  dur,
  delay,
}: {
  src: string;
  className: string;
  dur: string;
  delay: string;
}) {
  return (
    <div
      className={`animate-floaty ${className}`}
      style={{ "--dur": dur, "--delay": delay } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="w-full opacity-90 drop-shadow-[0_18px_30px_rgba(124,58,237,0.4)]"
      />
    </div>
  );
}
