import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Package,
  CheckCircle2,
  Tag,
  TrendingUp,
  UserPlus,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAdminMetrics, getAdminUsers } from "@/actions/admin";
import { formatBRL } from "@/lib/format";
import { Logo } from "@/components/layout/Logo";
import { AdminSignOut } from "@/components/admin/AdminSignOut";

export const metadata: Metadata = { title: "Painel — FlawSkins" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getUser();
  if (!isAdminEmail(user?.email)) redirect("/admin/login");

  const [metrics, users] = await Promise.all([
    getAdminMetrics(),
    getAdminUsers(),
  ]);

  if (!metrics) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center text-sm text-zinc-400">
        Não foi possível carregar as métricas. Recarregue a página.
      </div>
    );
  }

  const categorias = Object.entries(metrics.por_categoria).sort(
    (a, b) => b[1] - a[1]
  );
  const maxCat = Math.max(1, ...categorias.map(([, n]) => n));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5">
      {/* Topbar */}
      <header className="mb-6 flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-300">
            ADMIN
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 transition-colors hover:bg-zinc-800 sm:inline-flex"
          >
            <ExternalLink className="size-4" /> Ver site
          </Link>
          <AdminSignOut />
        </div>
      </header>

      {/* Métricas */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={Users} label="Usuários" value={String(metrics.total_usuarios)} hint={`+${metrics.usuarios_7d} em 7 dias`} />
        <Metric icon={Package} label="Anúncios" value={String(metrics.total_anuncios)} hint={`+${metrics.anuncios_7d} em 7 dias`} />
        <Metric icon={Tag} label="Ativos" value={String(metrics.anuncios_ativos)} hint={`${metrics.anuncios_vendidos} vendidos`} />
        <Metric icon={TrendingUp} label="Valor em catálogo" value={formatBRL(metrics.valor_total_ativo)} hint="anúncios ativos" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Categorias */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">
            Anúncios por categoria
          </h2>
          {categorias.length === 0 ? (
            <p className="text-sm text-zinc-500">Sem anúncios ainda.</p>
          ) : (
            <ul className="space-y-2.5">
              {categorias.map(([cat, n]) => (
                <li key={cat}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{cat}</span>
                    <span className="text-zinc-500">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-orange-500"
                      style={{ width: `${(n / maxCat) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Usuários */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
            <UserPlus className="size-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Usuários ({users.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th className="px-4 py-2 font-medium">Usuário</th>
                  <th className="px-4 py-2 font-medium">Região</th>
                  <th className="px-4 py-2 font-medium">WhatsApp</th>
                  <th className="px-4 py-2 text-right font-medium">Skins</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-800/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-orange-500 text-xs font-bold text-white">
                          {(u.nome || u.email).charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-100">
                            {u.nome || "—"}
                          </p>
                          <p className="truncate text-xs text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300">{u.regiao || "—"}</td>
                    <td className="px-4 py-2.5 text-zinc-300">{u.whatsapp || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 text-zinc-200">
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                        {u.total_anuncios}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-50">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}
