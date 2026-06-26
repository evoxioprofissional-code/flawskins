"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { desconectarMercadoPago } from "@/actions/rifas";

export function DesconectarMP() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  function desconectar() {
    startTransition(async () => {
      const res = await desconectarMercadoPago();
      if (res.ok) {
        toast.success("Mercado Pago desconectado.");
        setConfirmando(false);
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
        className="text-xs text-zinc-400 transition-colors hover:text-red-400 hover:underline"
      >
        desconectar
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
      Tem certeza?
      <button
        type="button"
        onClick={desconectar}
        disabled={pending}
        className="font-semibold text-red-400 hover:underline disabled:opacity-50"
      >
        {pending ? "desconectando…" : "sim, desconectar"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        disabled={pending}
        className="hover:underline disabled:opacity-50"
      >
        cancelar
      </button>
    </span>
  );
}
