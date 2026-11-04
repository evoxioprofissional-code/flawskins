import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Ticket } from "lucide-react";

import { getUser } from "@/lib/auth";
import { listarRifas } from "@/actions/rifas";
import { RifaCard } from "@/components/rifas/RifaCard";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Rifas de skins — Cloud Skins" };
export const dynamic = "force-dynamic";

export default async function RifasPage() {
  const [user, rifas] = await Promise.all([getUser(), listarRifas()]);
  const criar = user ? "/rifas/criar" : "/login?next=/rifas/criar";

  return (
    <>
      <PageHeader
        title="Rifas de skins"
        subtitle="Compre cotas, escolha seus números e concorra à skin."
        action={
          <div className="flex flex-wrap gap-2">
            {user && (
              <Link href="/rifas/minhas" className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-neutral-800 px-4 text-sm font-semibold hover:bg-neutral-700">
                <Ticket className="size-4" /> Minhas rifas
              </Link>
            )}
            <Link href={criar} className="cloud-button-primary inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold">
              <Plus className="size-4" /> Criar rifa
            </Link>
          </div>
        }
      />

      <section className="cloud-page-wide pb-10 pt-5" aria-label="Rifas disponíveis">
        {rifas.length === 0 ? (
          <div className="cloud-panel flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
            <span className="cloud-page-icon"><Ticket className="size-5" /></span>
            <h2 className="mt-4 text-lg font-bold">Nenhuma rifa disponível</h2>
            <p className="mt-2 max-w-md text-sm text-zinc-400">
              Crie uma rifa de skin e receba pelas cotas via Pix.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3.5">
            {rifas.map((rifa) => <RifaCard key={rifa.id} rifa={rifa} />)}
          </div>
        )}
      </section>
    </>
  );
}
