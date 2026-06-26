"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, PackageOpen, RefreshCw } from "lucide-react";

import { inventarioSteam } from "@/actions/steam";
import { SteamIcon } from "@/components/auth/SteamIcon";
import type { ItemInventario } from "@/lib/steam";

type Estado =
  | { tipo: "idle" }
  | { tipo: "erro"; msg: string; semSteam: boolean }
  | { tipo: "ok"; itens: ItemInventario[] };

export function ImportarSteam({
  onPick,
}: {
  onPick: (item: ItemInventario) => void;
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });
  const [pending, startTransition] = useTransition();

  function carregar() {
    startTransition(async () => {
      const res = await inventarioSteam();
      if (res.ok) {
        setEstado({ tipo: "ok", itens: res.data });
      } else {
        setEstado({
          tipo: "erro",
          msg: res.error,
          semSteam: /entre com a steam/i.test(res.error),
        });
      }
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SteamIcon className="size-5 text-zinc-300" />
          <div>
            <h2 className="text-sm font-bold text-zinc-100">
              Importar do inventário
            </h2>
            <p className="text-xs text-zinc-400">
              Puxe suas skins da Steam e anuncie com 1 clique.
            </p>
          </div>
        </div>
        {estado.tipo !== "idle" && (
          <button
            type="button"
            onClick={carregar}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        )}
      </div>

      {estado.tipo === "idle" && (
        <button
          type="button"
          onClick={carregar}
          disabled={pending}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#1b2838] to-[#2a475e] px-4 text-sm font-semibold text-white ring-1 ring-white/10 hover:opacity-90 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PackageOpen className="size-4" />
          )}
          {pending ? "Lendo inventário…" : "Carregar minhas skins"}
        </button>
      )}

      {estado.tipo === "erro" && (
        <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {estado.msg}
          {estado.semSteam && (
            <a
              href="/api/steam/login?next=/novo"
              className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-[#1b2838] to-[#2a475e] px-3 font-semibold text-white ring-1 ring-white/10 hover:opacity-90"
            >
              <SteamIcon className="size-4" /> Entrar com Steam
            </a>
          )}
        </div>
      )}

      {estado.tipo === "ok" && estado.itens.length === 0 && (
        <p className="mt-3 text-xs text-zinc-400">
          Nenhuma skin com desgaste encontrada no seu inventário.
        </p>
      )}

      {estado.tipo === "ok" && estado.itens.length > 0 && (
        <>
          <p className="mt-3 mb-2 text-xs text-zinc-400">
            {estado.itens.length} skins · toque em uma para preencher o anúncio
          </p>
          <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {estado.itens.map((it) => (
              <button
                key={it.assetId}
                type="button"
                onClick={() => onPick(it)}
                className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-left transition-colors hover:border-violet-500/60 hover:bg-zinc-900"
              >
                <div className="relative aspect-[4/3] w-full">
                  {it.image ? (
                    <Image
                      src={it.image}
                      alt={it.titulo}
                      fill
                      sizes="160px"
                      className="object-contain"
                      unoptimized
                    />
                  ) : null}
                </div>
                <span className="mt-1 line-clamp-2 text-[11px] leading-tight text-zinc-300">
                  {it.titulo}
                </span>
                <span className="text-[10px] text-zinc-500">{it.exterior}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
