import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth";
import { buscarPerfil } from "@/actions/perfil";
import { meusAnuncios } from "@/actions/anuncios";
import { getArenaStats } from "@/actions/arena";
import { ProfileForm } from "@/components/perfil/ProfileForm";
import { MySkins } from "@/components/perfil/MySkins";
import { ArenaStatsPanel } from "@/components/arena/ArenaStatsPanel";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Meu perfil — FlawSkins" };
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/perfil");

  const [perfil, anuncios, arenaStats] = await Promise.all([
    buscarPerfil(user.id),
    meusAnuncios(),
    getArenaStats(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <BackButton className="mb-4" />
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-zinc-100">
        Meu perfil
      </h1>

      <ProfileForm
        email={user.email ?? ""}
        nome={perfil?.nome ?? ""}
        regiao={perfil?.regiao ?? ""}
        whatsapp={perfil?.whatsapp ?? ""}
        avatarUrl={perfil?.avatar_url ?? null}
      />

      <div className="mt-8">
        <ArenaStatsPanel stats={arenaStats} />
      </div>

      <section className="mt-8">
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
