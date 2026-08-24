import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { meuPainelRifa } from "@/actions/rifas";
import { CriarRifaPainel } from "@/components/rifas/CriarRifaPainel";
import { RifaForm } from "@/components/rifas/RifaForm";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Criar minha rifa — Cloud Skins" };
export const dynamic = "force-dynamic";

export default async function CriarRifaPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/rifas/criar");

  const admin = isAdminEmail(user.email);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <BackButton className="mb-4" fallback="/rifas" />
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          {admin ? "Criar " : "Criar minha "}
          <span className="bg-gradient-to-r from-blue-400 to-sky-400 bg-clip-text text-transparent">
            rifa
          </span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {admin
            ? "Você é admin — cria rifas da plataforma."
            : "Conecte seu Mercado Pago e publique. As cotas caem direto na sua conta; a plataforma retém uma pequena % de cada cota."}
        </p>
      </header>

      {admin ? <RifaForm /> : <CriarRifaUsuario />}
    </div>
  );
}

async function CriarRifaUsuario() {
  const { mp_conectado, percentual } = await meuPainelRifa();
  return <CriarRifaPainel conectado={mp_conectado} percentual={percentual} />;
}
