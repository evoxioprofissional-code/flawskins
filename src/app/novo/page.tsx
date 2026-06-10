import type { Metadata } from "next";
import { SkinForm } from "@/components/skins/SkinForm";

export const metadata: Metadata = {
  title: "Anunciar skin — FlawSkins",
};

export default function NovoAnuncioPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Anunciar uma skin
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Preencha os dados, publique em segundos e negocie direto no WhatsApp.
        </p>
      </header>
      <SkinForm />
    </div>
  );
}
