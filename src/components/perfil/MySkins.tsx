"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";

import type { Anuncio } from "@/types/database";
import { formatBRL } from "@/lib/format";
import { alternarVendido, excluirAnuncio } from "@/actions/anuncios";
import { cn } from "@/lib/utils";

export function MySkins({ anuncios }: { anuncios: Anuncio[] }) {
  if (anuncios.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-12 text-center">
        <p className="text-sm font-medium text-zinc-300">
          Você ainda não tem skins anunciadas
        </p>
        <Link
          href="/novo"
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Anunciar uma skin
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {anuncios.map((a) => (
        <MySkinRow key={a.id} anuncio={a} />
      ))}
    </ul>
  );
}

function MySkinRow({ anuncio }: { anuncio: Anuncio }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const vendido = anuncio.status === "vendido";

  function toggleVendido() {
    startTransition(async () => {
      const res = await alternarVendido(anuncio.id, !vendido);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(vendido ? "Reativada!" : "Marcada como vendida!");
      router.refresh();
    });
  }

  function excluir() {
    startTransition(async () => {
      const res = await excluirAnuncio(anuncio.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Anúncio excluído.");
      router.refresh();
    });
  }

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3",
        pending && "opacity-60"
      )}
    >
      <Link
        href={`/skin/${anuncio.id}`}
        className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-zinc-950"
      >
        <Image
          src={anuncio.image_url}
          alt={anuncio.titulo}
          fill
          sizes="64px"
          className="object-cover"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">
          {anuncio.titulo}
        </p>
        <p className="text-sm font-bold text-orange-400">
          {formatBRL(anuncio.preco)}
        </p>
        <span
          className={cn(
            "mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
            vendido
              ? "bg-zinc-700 text-zinc-300"
              : "bg-emerald-500/15 text-emerald-400"
          )}
        >
          {vendido ? "VENDIDO" : "ATIVO"}
        </span>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        <button
          type="button"
          onClick={toggleVendido}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          {vendido ? (
            <>
              <RotateCcw className="size-3" /> Reativar
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3" /> Vendido
            </>
          )}
        </button>

        {confirmando ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={excluir}
              disabled={pending}
              className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="size-3" /> Excluir
          </button>
        )}
      </div>
    </li>
  );
}
