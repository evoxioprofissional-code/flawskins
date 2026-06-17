import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Ticket } from "lucide-react";

import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { listarRifas } from "@/actions/rifas";
import { RifaCard } from "@/components/rifas/RifaCard";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Rifas de skins — FlawSkins" };
export const dynamic = "force-dynamic";

export default async function RifasPage() {
  const [user, rifas] = await Promise.all([getUser(), listarRifas()]);
  const admin = isAdminEmail(user?.email);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <BackButton className="mb-4" />

      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Rifas de{" "}
            <span className="bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">
              skins
            </span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Compre cotas, escolha seus números e concorra à skin.
          </p>
        </div>
        {admin && (
          <Link
            href="/rifas/nova"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-orange-500 px-4 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> Nova rifa
          </Link>
        )}
      </header>

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
  );
}
