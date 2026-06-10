import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Admin — FlawSkins" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // Já é admin? vai direto pro painel.
  const user = await getUser();
  if (isAdminEmail(user?.email)) redirect("/admin");

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-orange-500 text-white">
            <ShieldCheck className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-100">
            Painel do Admin
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Acesso restrito à administração do FlawSkins.
          </p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
