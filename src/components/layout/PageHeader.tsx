import { BackButton } from "@/components/layout/BackButton";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  badge,
  action,
  backTo,
  max,
}: {
  title: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  backTo?: string;
  max?: string;
}) {
  return (
    <header className={cn("cloud-page-wide mx-auto", max)}>
      <div className="cloud-page-heading">
        {backTo && <BackButton className="mb-3" fallback={backTo} />}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="cloud-page-title">{title}</h1>
              {badge}
            </div>
            {subtitle && <p className="mt-1.5 text-sm text-zinc-400">{subtitle}</p>}
          </div>
          {action}
        </div>
      </div>
    </header>
  );
}
