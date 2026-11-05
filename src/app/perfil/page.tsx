import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth";
import { buscarPerfil } from "@/actions/perfil";
import { meusAnuncios } from "@/actions/anuncios";
import { ProfileForm } from "@/components/perfil/ProfileForm";
import { MySkins } from "@/components/perfil/MySkins";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Meu perfil — Cloud Skins" };
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/perfil");

  const [perfil, anuncios] = await Promise.all([
    buscarPerfil(user.id),
    meusAnuncios(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <BackButton className="mb-4" />
      <h1 className="cloud-page-title mb-6">
        Meu perfil
      </h1>

      <ProfileForm
        email={user.email ?? ""}
        nome={perfil?.nome ?? ""}
        regiao={perfil?.regiao ?? ""}
        whatsapp={perfil?.whatsapp ?? ""}
        avatarUrl={perfil?.avatar_url ?? null}
      />

      <section id="inventario" className="mt-8 scroll-mt-20">
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">
          Minhas skins{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({anuncios.length})
          </span>
        </h2>
        <MySkins anuncios={anuncios} />
      </section>
    </div>
  );
}
