import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth";
import { buscarPerfil } from "@/actions/perfil";
import { SkinForm } from "@/components/skins/SkinForm";

export const metadata: Metadata = {
  title: "Anunciar skin — FlawSkins",
};

export default async function NovoAnuncioPage() {
  const user = await getUser();
  if (!user) redirect("/cadastro?next=/novo");

  const perfil = await buscarPerfil(user.id);
  const nome =
    perfil?.nome ?? (user.user_metadata?.nome as string | undefined) ?? "";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Anunciar uma skin
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Preencha os dados, publique em segundos e negocie direto no WhatsApp.
        </p>
      </header>
      <SkinForm
        defaultNome={nome}
        defaultWhatsapp={perfil?.whatsapp ?? ""}
        defaultCidade={perfil?.regiao ?? ""}
      />
    </div>
  );
}
