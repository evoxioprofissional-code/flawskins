import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

// TODO: trocar o ícone Flame pelo SVG real da fênix em public/logo.svg
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="FlawSkins — início"
      className={cn("flex items-center gap-2", className)}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 shadow-[0_0_18px_-4px] shadow-violet-500/50">
        <Flame className="size-5 text-white" />
      </span>
      <span className="text-lg font-bold tracking-tight">
        <span className="bg-gradient-to-r from-violet-400 to-violet-500 bg-clip-text text-transparent">
          Flaw
        </span>
        <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
          Skins
        </span>
      </span>
    </Link>
  );
}
