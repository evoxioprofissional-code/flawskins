import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { buscarPerfil } from "@/actions/perfil";
import { getArenaStats } from "@/actions/arena";
import type { Anuncio } from "@/types/database";
import { ArenaStatsPanel } from "@/components/arena/ArenaStatsPanel";
import { SkinGrid } from "@/components/skins/SkinGrid";
import { BackButton } from "@/components/layout/BackButton";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const perfil = await buscarPerfil(id);
  return { title: `${perfil?.nome ?? "Jogador"} — FlawSkins` };
}

export default async function PublicProfilePage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const [perfil, stats, { data: anuncios }] = await Promise.all([
    buscarPerfil(id),
    getArenaStats(id),
    supabase
      .from("anuncios")
      .select("*")
      .eq("user_id", id)
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .returns<Anuncio[]>(),
  ]);

  if (!perfil) notFound();
  const inicial = (perfil.nome ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackButton className="mb-4" />

      <header className="mb-6 flex items-center gap-4">
        <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-orange-500 text-2xl font-bold text-white">
          {perfil.avatar_url ? (
            <Image
              src={perfil.avatar_url}
              alt={perfil.nome ?? "Avatar"}
              width={80}
              height={80}
              className="size-20 object-cover"
            />
          ) : (
            inicial
          )}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-100">
            {perfil.nome ?? "Jogador"}
          </h1>
          {perfil.regiao && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-400">
              <MapPin className="size-3.5" /> {perfil.regiao}
            </p>
          )}
        </div>
      </header>

      <ArenaStatsPanel stats={stats} />

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">
          Skins à venda{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({anuncios?.length ?? 0})
          </span>
        </h2>
        <SkinGrid anuncios={anuncios ?? []} />
      </section>
    </div>
  );
}
