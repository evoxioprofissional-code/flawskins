import { Suspense } from "react";
import type { Metadata } from "next";

import { Logo } from "@/components/layout/Logo";
import { AuthForm } from "@/components/auth/AuthForm";
import { SteamAuthBlock } from "@/components/auth/SteamAuthBlock";
import { BackButton } from "@/components/layout/BackButton";

export const metadata: Metadata = { title: "Entrar — Vision Skins" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col px-4 py-10">
      <BackButton className="mb-6 self-start" />
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
  );
}
