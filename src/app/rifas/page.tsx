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

  return (
    <>
      <PageHeader
        title={
          <>
            Rifas de{" "}
            <span className="bg-gradient-to-r from-blue-400 to-sky-400 bg-clip-text text-transparent">
              skins
            </span>
          </>
        }
        subtitle="Compre cotas, escolha seus números e concorra à skin."
        action={
          user && (
            <Link
              href="/rifas/criar"
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-neutral-800 ring-1 ring-white/10 hover:bg-neutral-700 px-5 text-sm font-semibold text-blue-300 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="size-4" /> Criar minha rifa
            </Link>
          )
        }
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {rifas.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-neutral-900 px-6 py-14 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg shadow-blue-500/20">
            <Ticket className="size-7" />
          </div>
          <h2 className="font-display mt-4 text-xl font-bold text-zinc-100">
            Ainda não tem rifa rolando
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Seja o primeiro: rife a sua skin, venda as cotas por Pix (o dinheiro
            cai direto na sua conta) e sorteie o vencedor. A plataforma fica com
            só <strong className="text-zinc-200">5% de cada cota</strong>.
          </p>
          <Link
            href={user ? "/rifas/criar" : "/login?next=/rifas/criar"}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="size-4" />
            {user ? "Criar minha rifa" : "Entrar e criar rifa"}
          </Link>
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
