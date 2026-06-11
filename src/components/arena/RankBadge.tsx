import { cn } from "@/lib/utils";
import { TIER_META, type ArenaTier } from "@/types/arena";

export function RankBadge({
  tier,
  size = "md",
}: {
  tier: ArenaTier;
  size?: "sm" | "md";
}) {
  const meta = TIER_META[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 font-bold ring-1",
        meta.cor,
        meta.anel,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span aria-hidden>{meta.emoji}</span>
      {tier}
    </span>
  );
}
