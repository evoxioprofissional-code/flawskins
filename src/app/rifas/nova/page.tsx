import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { RifaForm } from "@/components/rifas/RifaForm";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Nova rifa — Vision Skins" };
export const dynamic = "force-dynamic";

export default async function NovaRifaPage() {
  const user = await getUser();
  if (!isAdminEmail(user?.email)) redirect("/rifas");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <BackButton className="mb-4" fallback="/rifas" />
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Nova rifa
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Defina o prêmio, o valor da cota e quantos números a rifa terá.
        </p>
      </header>
      <RifaForm />
    </div>
  );
}
