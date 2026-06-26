import Link from "next/link";
import type { Metadata } from "next";
import { Bell } from "lucide-react";

import { getUser } from "@/lib/auth";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Alertas — Vision Skins" };

export default async function AlertasPage() {
  const user = await getUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <BackButton className="mb-4" />
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Alertas
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Avisos sobre seus anúncios e interesse de compradores.
        </p>
      </header>

      <div className="grid place-items-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
        <Bell className="size-10 text-zinc-600" />
        <p className="mt-3 text-sm font-medium text-zinc-300">
          {user ? "Você não tem alertas" : "Entre para ver seus alertas"}
        </p>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">
          {user
            ? "Quando alguém demonstrar interesse nas suas skins, os avisos aparecem aqui."
            : "Faça login para acompanhar o interesse nas suas skins."}
        </p>
        {!user && (
          <Link
            href="/login?next=/alertas"
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-600"
          >
            Entrar
          </Link>
        )}
      </div>
    </div>
  );
}
