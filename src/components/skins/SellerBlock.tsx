import { BadgeCheck, MapPin } from "lucide-react";

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function SellerBlock({
  nome,
  cidade,
}: {
  nome: string;
  cidade: string | null;
}) {
  return (
    <div>
      <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
        Seller
      </span>
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-orange-500 text-sm font-bold text-white">
          {iniciais(nome) || "?"}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-zinc-100">{nome}</span>
            {/* TODO (v2): selo apenas cosmético — sem verificação real ainda */}
            <BadgeCheck className="size-4 shrink-0 text-emerald-400" />
          </div>
          {cidade && (
            <span className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
              <MapPin className="size-3" />
              {cidade}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
