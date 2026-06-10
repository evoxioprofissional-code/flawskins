"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

// Botão "voltar". Usa o histórico do navegador; se não houver de onde voltar
// (ex.: o usuário abriu o link direto), cai no fallback informado.
export function BackButton({
  fallback = "/",
  label = "Voltar",
  className,
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function voltar() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={voltar}
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-800 pr-3 pl-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100",
        className
      )}
    >
      <ChevronLeft className="size-4" />
      {label}
    </button>
  );
}
