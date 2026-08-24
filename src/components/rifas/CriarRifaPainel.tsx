import { BadgeCheck, Wallet } from "lucide-react";

import { RifaForm } from "@/components/rifas/RifaForm";

// 2 passos: conectar Mercado Pago → formulário. A plataforma ganha % de cada
// cota (via application_fee), então não há taxa pra criar.
export function CriarRifaPainel({
  conectado,
  percentual,
}: {
  conectado: boolean;
  percentual: number;
}) {
  if (!conectado) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <span className="mb-3 inline-grid size-8 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-sky-500 text-sm font-bold text-white">
          1
        </span>
        <h2 className="text-lg font-bold text-zinc-100">
          Conecte sua conta Mercado Pago
        </h2>
        <p className="mt-1 mb-4 max-w-md text-sm text-zinc-400">
          O dinheiro das cotas cai direto na sua conta. A plataforma retém apenas{" "}
          <strong className="text-zinc-200">{percentual}% de cada cota</strong>{" "}
          vendida — sem taxa pra criar. Conecte uma vez e pronto.
        </p>
        <a
          href="/api/mp/oauth/connect"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#009ee3] px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Wallet className="size-4" /> Conectar Mercado Pago
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
        <BadgeCheck className="size-4" /> Mercado Pago conectado. As cotas caem na
        sua conta; a plataforma retém {percentual}% de cada uma.
      </div>
      <RifaForm usuario />
    </div>
  );
}
