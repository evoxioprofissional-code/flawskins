import { BackButton } from "@/components/layout/BackButton";
import { cn } from "@/lib/utils";

// Cabeçalho de página no estilo do hero: faixa full-width com estrelas,
// gradiente de marca e título em fonte de display.
export function PageHeader({
  title,
  subtitle,
  badge,
  action,
  backTo,
  max = "max-w-5xl",
}: {
  title: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  backTo?: string;
  max?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-800/70">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_130%_at_12%_-30%,rgba(124,58,237,0.28),transparent_60%),radial-gradient(70%_110%_at_100%_-10%,rgba(217,70,239,0.18),transparent_55%)]" />
      <div className="starfield pointer-events-none absolute inset-0 opacity-60" />

      <div className={cn("relative mx-auto px-4 py-7 sm:py-9", max)}>
        <BackButton className="mb-4" fallback={backTo} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-2 max-w-xl text-sm text-zinc-300 sm:text-base">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      </div>
    </section>
  );
}
