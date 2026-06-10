"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function AdminSignOut() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      disabled={saindo}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-60"
    >
      <LogOut className="size-4" />
      {saindo ? "Saindo..." : "Sair"}
    </button>
  );
}
