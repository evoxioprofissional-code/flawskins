import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Ticket } from "lucide-react";

import { getUser } from "@/lib/auth";
import { listarRifas } from "@/actions/rifas";
import { RifaCard } from "@/components/rifas/RifaCard";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Rifas de skins — Vision Skins" };
export const dynamic = "force-dynamic";

export default async function RifasPage() {
  const [user, rifas] = await Promise.all([getUser(), listarRifas()]);

  return (
    <>
      <PageHeader
        title={
          <>
            Rifas de{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              skins
            </span>
          </>
        }
        subtitle="Compre cotas, escolha seus números e concorra à skin."
        action={
          user && (
            <Link
              href="/rifas/criar"
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-neutral-800 ring-1 ring-white/10 hover:bg-neutral-700 px-5 text-sm font-semibold text-violet-300 shadow-lg shadow-fuchsia-500/25 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="size-4" /> Criar minha rifa
            </Link>
          )
        }
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {rifas.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
          <Ticket className="size-10 text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-zinc-300">
            Nenhuma rifa no momento
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Fique de olho — em breve tem skin valendo.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rifas.map((r) => (
            <RifaCard key={r.id} rifa={r} />
          ))}
        </div>
      )}
      </div>
    </>
  );
}
