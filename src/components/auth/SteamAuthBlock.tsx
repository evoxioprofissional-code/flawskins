"use client";

import { useSearchParams } from "next/navigation";

import { SteamButton } from "@/components/auth/SteamButton";

const MOTIVO_LABEL: Record<string, string> = {
  validacao: "não deu pra validar com a Steam",
  config: "configuração do servidor",
  criar: "falha ao criar a conta",
  link: "falha ao gerar a sessão",
  sessao: "falha ao abrir a sessão",
};

// Botão Steam + separador "ou", usado acima do formulário de email.
export function SteamAuthBlock() {
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const erro = search.get("steam") === "erro";
  const motivo = search.get("motivo") || "";

  return (
    <div className="mb-5">
      {erro && (
        <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Não foi possível entrar com a Steam
          {MOTIVO_LABEL[motivo] ? ` (${MOTIVO_LABEL[motivo]})` : ""}. Tente de novo.
        </p>
      )}
      <SteamButton next={next} />
      <div className="my-5 flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-800" />
        ou com email
        <span className="h-px flex-1 bg-zinc-800" />
      </div>
    </div>
  );
}
