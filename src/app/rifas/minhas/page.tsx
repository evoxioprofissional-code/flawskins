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
            className="cloud-button-primary inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold"
          >
            <Plus className="size-4" /> Criar rifa
          </Link>
        }
      />

      <div className="cloud-page-wide py-5">
        {rifas.length === 0 ? (
          <div className="mx-auto max-w-xl cloud-panel px-6 py-14 text-center">
            <div className="cloud-page-icon mx-auto">
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
              className="cloud-button-primary mt-6 inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold"
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
    <div className="cloud-panel p-4">
      <p className={`text-lg font-bold sm:text-2xl ${cor}`}>{valor}</p>
      <p className="mt-0.5 text-[11px] text-zinc-500 sm:text-xs">{label}</p>
    </div>
  );
}
