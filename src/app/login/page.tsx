import { Suspense } from "react";
import type { Metadata } from "next";

import { Logo } from "@/components/layout/Logo";
import { AuthForm } from "@/components/auth/AuthForm";
import { SteamAuthBlock } from "@/components/auth/SteamAuthBlock";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Entrar — Cloud Skins" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-10">
      <BackButton className="mb-6 self-start" />
      <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-xl shadow-black/40 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-100">
            Entrar
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Bem-vindo de volta. Acesse sua conta.
          </p>
        </div>
        <Suspense>
          <SteamAuthBlock />
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </div>
  );
}
