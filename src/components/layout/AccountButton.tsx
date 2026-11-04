"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Área de conta no header. Recebe o estado inicial do servidor para não piscar.
export function AccountButton({
  nome,
  avatar,
}: {
  nome: string | null;
  avatar?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saindo, setSaindo] = useState(false);

  if (!nome) {
    return (
      <Link
        href="/login"
        className="site-header-account" aria-label="Entrar"
      >
        <User aria-hidden="true" className="size-5" />
      </Link>
    );
  }

  const inicial = nome.trim().charAt(0).toUpperCase() || "?";

  async function sair() {
    setSaindo(true);
    await createClient().auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Conta"
        className="site-header-account"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="size-full object-cover" />
        ) : (
          inicial
        )}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5 text-sm text-zinc-300">
              <User className="size-4 text-zinc-500" />
              <span className="truncate">{nome}</span>
            </div>
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              <User className="size-4" />
              Meu perfil
            </Link>
            <button
              type="button"
              onClick={sair}
              disabled={saindo}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-800",
                saindo && "opacity-60"
              )}
            >
              <LogOut className="size-4" />
              {saindo ? "Saindo..." : "Sair"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
