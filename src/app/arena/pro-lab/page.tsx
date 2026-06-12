import type { Metadata } from "next";

import { getUser } from "@/lib/auth";
import {
  getMyPresetStats,
  getPresetRanking,
  getTopPreset,
  listComunidade,
} from "@/actions/arena";
import { ProLab } from "@/components/arena/ProLab";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Pro Player Lab — Flaw Arena" };
export const dynamic = "force-dynamic";

export default async function ProLabPage() {
  const user = await getUser();

  const [presetRanking, topPreset, comunidade, myStats] = await Promise.all([
    getPresetRanking(),
    getTopPreset(),
    listComunidade(),
    user ? getMyPresetStats(user.id, "gridshot") : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <BackButton className="mb-4" fallback="/arena" />

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Pro Player{" "}
          <span className="bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">
            Lab
          </span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Jogue com a configuração dos profissionais, compare resultados e
          descubra com qual setup você performa melhor.
        </p>
      </header>

      <ProLab
        logged={!!user}
        meuId={user?.id ?? null}
        presetRanking={presetRanking}
        topPreset={topPreset}
        comunidade={comunidade}
        myStats={myStats}
      />
    </div>
  );
}
