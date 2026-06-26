import Link from "next/link";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

// Marca Vision Skins: olho (gradiente roxo→fúcsia) + wordmark "Vision" (prata)
// "Skins" (roxo). TODO: trocar pelo SVG real do emblema em public/logo.svg
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Vision Skins — início"
      className={cn("flex items-center gap-2", className)}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-[0_0_18px_-4px] shadow-fuchsia-500/50 ring-1 ring-white/10">
        <Eye className="size-5 text-white" />
      </span>
      <span className="text-lg font-bold tracking-tight">
        <span className="bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Vision
        </span>{" "}
        <span className="bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-transparent">
          Skins
        </span>
      </span>
    </Link>
  );
}
