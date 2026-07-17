"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { excluirAnuncioAdmin } from "@/actions/anuncios";

// Botão de exclusão para o admin (remove o anúncio de qualquer usuário).
export function AdminDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  function excluir() {
    startTransition(async () => {
      const res = await excluirAnuncioAdmin(id);
      if (res.ok) {
        toast.success("Anúncio excluído.");
        router.push("/");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
      >
        <Trash2 className="size-4" /> Excluir anúncio (admin)
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-400">Confirmar exclusão?</span>
      <button
        type="button"
        onClick={excluir}
        disabled={pending}
        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
      >
        {pending ? "Excluindo…" : "Sim, excluir"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        disabled={pending}
        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
      >
        Cancelar
      </button>
    </div>
  );
}
