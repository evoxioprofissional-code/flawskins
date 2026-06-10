import { AlertTriangle } from "lucide-react";

import { listarAnuncios } from "@/actions/anuncios";
import { SkinGrid } from "@/components/skins/SkinGrid";
import type { Anuncio } from "@/types/database";

// Feed sempre fresco no MVP.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let anuncios: Anuncio[] = [];
  let erro = false;

  try {
    anuncios = await listarAnuncios();
  } catch {
    erro = true;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5">
      {/* Hero curto com a vibe Asiimov */}
      <section className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          Skins de CS2,{" "}
          <span className="bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">
            direto com o vendedor
          </span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          O classificado P2P da comunidade. Encontrou? Fecha no WhatsApp.
        </p>
      </section>

      {erro ? (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-6 text-sm text-zinc-300">
          <AlertTriangle className="size-5 text-orange-400" />
          Não foi possível carregar o feed agora. Tente novamente em instantes.
        </div>
      ) : (
        <SkinGrid anuncios={anuncios} />
      )}
    </div>
  );
}
