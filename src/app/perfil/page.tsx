import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Wallet } from "lucide-react";

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

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login?next=/perfil");

  const { mp } = await searchParams;
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

      {/* Receber pagamentos (Mercado Pago) */}
      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <Wallet className="size-4 text-emerald-400" /> Receber pagamentos (rifas)
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Conecte sua conta Mercado Pago para criar rifas — o dinheiro das cotas
          cai direto na sua conta.
        </p>
        {mp === "ok" && (
          <p className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
            Conta conectada com sucesso!
          </p>
        )}
        {mp === "erro" && (
          <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
            Não foi possível conectar. Tente de novo.
          </p>
        )}
        <div className="mt-3">
          {perfil?.mp_conectado ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-300">
                <BadgeCheck className="size-4" /> Mercado Pago conectado
              </span>
              <a href="/api/mp/oauth/connect" className="text-xs text-zinc-400 hover:underline">
                reconectar
              </a>
            </div>
          ) : (
            <a
              href="/api/mp/oauth/connect"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#009ee3] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Wallet className="size-4" /> Conectar Mercado Pago
            </a>
          )}
        </div>
      </section>

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
