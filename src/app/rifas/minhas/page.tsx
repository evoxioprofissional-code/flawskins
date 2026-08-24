import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Ticket } from "lucide-react";

import { getUser } from "@/lib/auth";
import { listarMinhasRifas } from "@/actions/rifas";
import { formatBRL } from "@/lib/format";
import { MinhaRifaCard } from "@/components/rifas/MinhaRifaCard";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Minhas rifas — Cloud Skins" };
export const dynamic = "force-dynamic";

export default async function MinhasRifasPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/rifas/minhas");

  const rifas = await listarMinhasRifas();

  const totalArrecadado = rifas.reduce((s, r) => s + r.arrecadado, 0);
  const totalLiquido = rifas.reduce((s, r) => s + r.liquido, 0);
  const ativas = rifas.filter((r) => r.status === "aberta").length;

  return (
    <>
      <PageHeader
        title="Minhas rifas"
        subtitle="Acompanhe suas vendas e o quanto você já faturou."
        backTo="/rifas"
        action={
          <Link
            href="/rifas/criar"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-neutral-800 px-5 text-sm font-semibold text-blue-300 ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 hover:bg-neutral-700"
          >
            <Plus className="size-4" /> Criar rifa
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {rifas.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-neutral-900 px-6 py-14 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg shadow-blue-500/20">
              <Ticket className="size-7" />
            </div>
            <h2 className="font-display mt-4 text-xl font-bold text-zinc-100">
              Você ainda não criou nenhuma rifa
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
              Rife uma skin, venda as cotas por Pix e acompanhe seu faturamento
              aqui.
            </p>
            <Link
              href="/rifas/criar"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <Plus className="size-4" /> Criar minha rifa
            </Link>
          </div>
        ) : (
          <>
            {/* Resumo geral */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <Resumo label="Arrecadado (total)" valor={formatBRL(totalArrecadado)} />
              <Resumo
                label="Sua parte (total)"
                valor={formatBRL(totalLiquido)}
                cor="text-emerald-400"
              />
              <Resumo label="Rifas ativas" valor={String(ativas)} cor="text-sky-400" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {rifas.map((r) => (
                <MinhaRifaCard key={r.id} rifa={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Resumo({
  label,
  valor,
  cor = "text-zinc-100",
}: {
  label: string;
  valor: string;
  cor?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
      <p className={`text-lg font-bold sm:text-2xl ${cor}`}>{valor}</p>
      <p className="mt-0.5 text-[11px] text-zinc-500 sm:text-xs">{label}</p>
    </div>
  );
}
