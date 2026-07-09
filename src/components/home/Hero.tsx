import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

type Props = {
  total: number;
  skins?: string[];
  avatares?: string[];
  membros?: number;
};

export function Hero({ total, skins = [], avatares = [], membros = 0 }: Props) {
  const centro = skins[0];
  const flancos = skins.slice(1, 3);

  return (
    <section className="relative overflow-hidden border-b border-zinc-800/70">
      {/* Fundo: gradientes de marca + estrelas */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_50%_-20%,rgba(124,58,237,0.32),transparent_62%),radial-gradient(60%_90%_at_85%_10%,rgba(217,70,239,0.20),transparent_55%)]" />
      <div className="starfield pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-4 text-center sm:pt-20">
        {/* Prova social */}
        <div className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
          {avatares.length > 0 && (
            <div className="flex -space-x-2">
              {avatares.slice(0, 4).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="size-6 rounded-full object-cover ring-2 ring-zinc-950"
                />
              ))}
            </div>
          )}
          <span className="text-xs font-medium text-zinc-200">
            <span className="text-emerald-400">●</span>{" "}
            {total > 0 ? `${total} skins à venda` : "Comunidade de CS2"}
            {membros >= 10 ? ` · ${membros} na comunidade` : ""}
          </span>
        </div>

        {/* Título de impacto */}
        <h1 className="font-impact mx-auto mt-6 max-w-3xl text-5xl leading-[0.95] tracking-tight text-white uppercase sm:text-6xl lg:text-7xl">
          Skins de CS2,
          <br />
          <span
            className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300 bg-clip-text text-transparent"
            style={{ filter: "drop-shadow(0 0 32px rgba(217,70,239,0.55))" }}
          >
            direto com o vendedor
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base text-zinc-300 sm:text-lg">
          Importe seu inventário da Steam, publique em segundos e feche no
          WhatsApp. Sem taxa pra comprar, sem intermediário travando o negócio.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#skins"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-7 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition-all hover:-translate-y-0.5 hover:shadow-fuchsia-500/50"
          >
            Ver skins <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/novo"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-7 text-sm font-semibold text-zinc-100 backdrop-blur transition-colors hover:bg-zinc-800"
          >
            Vender minha skin
          </Link>
        </div>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-400">
          {["Sem taxa para comprar", "Importe da Steam em 1 clique", "Negocie no WhatsApp"].map(
            (t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" /> {t}
              </li>
            )
          )}
        </ul>

        {/* Centerpiece: skin grande no centro + laterais, sobre um pedestal de luz */}
        {centro && (
          <div className="relative mt-10 flex items-center justify-center gap-3 sm:mt-14 sm:gap-8">
            {flancos[0] && (
              <FloatImg
                src={flancos[0]}
                className="hidden w-28 -rotate-6 sm:block lg:w-40"
                dur="8.5s"
                delay="0.6s"
              />
            )}
            <div className="relative">
              <div className="absolute -bottom-2 left-1/2 h-14 w-56 -translate-x-1/2 rounded-[100%] bg-fuchsia-500/30 blur-2xl sm:w-72" />
              <FloatImg
                src={centro}
                className="relative w-64 sm:w-80 lg:w-[26rem]"
                dur="7s"
                delay="0s"
                strong
              />
            </div>
            {flancos[1] && (
              <FloatImg
                src={flancos[1]}
                className="hidden w-28 rotate-6 sm:block lg:w-40"
                dur="9s"
                delay="1.2s"
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function FloatImg({
  src,
  className,
  dur,
  delay,
  strong,
}: {
  src: string;
  className: string;
  dur: string;
  delay: string;
  strong?: boolean;
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
        className={
          strong
            ? "w-full drop-shadow-[0_30px_50px_rgba(124,58,237,0.55)]"
            : "w-full opacity-90 drop-shadow-[0_18px_30px_rgba(124,58,237,0.4)]"
        }
      />
    </div>
  );
}
