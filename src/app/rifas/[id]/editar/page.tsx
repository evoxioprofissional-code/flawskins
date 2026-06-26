import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { buscarRifa } from "@/actions/rifas";
import { RifaForm } from "@/components/rifas/RifaForm";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Editar rifa — Vision Skins" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function EditarRifaPage({ params }: Params) {
  const { id } = await params;
  const user = await getUser();
  if (!isAdminEmail(user?.email)) redirect("/rifas");

  const rifa = await buscarRifa(id);
  if (!rifa) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <BackButton className="mb-4" fallback={`/rifas/${id}`} />
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Editar rifa
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{rifa.titulo}</p>
      </header>
      <RifaForm rifa={rifa} />
    </div>
  );
}
