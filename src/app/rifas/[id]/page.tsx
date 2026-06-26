import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { buscarRifa, listarParticipantes, numerosDaRifa } from "@/actions/rifas";
import { buscarPerfil } from "@/actions/perfil";
import { formatBRL } from "@/lib/format";
import { RIFA_STATUS_LABEL } from "@/types/rifa";
import { RifaReserva } from "@/components/rifas/RifaReserva";
import { RifaAdmin } from "@/components/rifas/RifaAdmin";
import { Participantes } from "@/components/rifas/Participantes";
import { BackButton } from "@/components/layout/BackButton";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const rifa = await buscarRifa(id);
  return { title: rifa ? `${rifa.titulo} — Rifa Vision Skins` : "Rifa — Vision Skins" };
}

export default async function RifaPage({ params }: Params) {
  const { id } = await params;
  const [rifa, user] = await Promise.all([buscarRifa(id), getUser()]);
  if (!rifa) notFound();

  const admin = isAdminEmail(user?.email);
  const ehDono = !!user && user.id === rifa.created_by;
  const podeGerenciar = admin || ehDono;
  const [numeros, participantes] = await Promise.all([
    numerosDaRifa(rifa.id),
    listarParticipantes(rifa.id),
  ]);
  const meus = user ? numeros.filter((n) => n.user_id === user.id) : [];
  const pagos = numeros.filter((n) => n.status === "pago").length;
  const reservados = numeros.length - pagos;

  const vencedorPerfil = rifa.vencedor_user_id
    ? await buscarPerfil(rifa.vencedor_user_id)
    : null;

  const pct = Math.min(100, Math.round((rifa.vendidos / rifa.total_numeros) * 100));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackButton className="mb-4" fallback="/rifas" />

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        {rifa.image_url ? (
          <Image
            src={rifa.image_url}
            alt={rifa.titulo}
            fill
            sizes="(max-width: 768px) 100vw, 48rem"
            className="object-cover"
            priority
          />
        ) : (
          <div className="grid h-full place-items-center text-zinc-700">
            <Trophy className="size-12" />
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-zinc-950/80 px-3 py-1 text-xs font-semibold text-zinc-100">
          {RIFA_STATUS_LABEL[rifa.status]}
        </span>
      </div>

      <header className="mt-5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          {rifa.titulo}
        </h1>
        <p className="mt-1 text-sm text-zinc-300">🎁 Prêmio: {rifa.premio}</p>
        {rifa.descricao && (
          <p className="mt-2 text-sm text-zinc-400">{rifa.descricao}</p>
        )}
      </header>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Cota" v={formatBRL(rifa.preco_cota)} cor="text-fuchsia-400" />
        <Stat label="Vendidas" v={`${rifa.vendidos}/${rifa.total_numeros}`} />
        <Stat label="Progresso" v={`${pct}%`} />
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Vencedor */}
      {rifa.status === "finalizada" && rifa.vencedor_numero != null && (
        <div className="mt-5 rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 p-5 text-center">
          <Trophy className="mx-auto size-8 text-yellow-400" />
          <p className="mt-2 text-sm text-zinc-300">Número sorteado</p>
          <p className="text-4xl font-black text-zinc-50">{rifa.vencedor_numero}</p>
          <p className="mt-1 text-sm text-violet-200">
            Ganhador: {vencedorPerfil?.nome ?? "—"}
          </p>
        </div>
      )}

      {/* Controles do admin / criador */}
      {podeGerenciar && (
        <div className="mt-5">
          <RifaAdmin
            rifaId={rifa.id}
            status={rifa.status}
            reservados={reservados}
            pagos={pagos}
            souAdmin={admin}
          />
        </div>
      )}

      {/* Reserva */}
      <div className="mt-5">
        <RifaReserva
          rifaId={rifa.id}
          total={rifa.total_numeros}
          preco={rifa.preco_cota}
          vendidos={rifa.vendidos}
          aberta={rifa.status === "aberta"}
          logged={!!user}
          taken={numeros.map((n) => ({ numero: n.numero, user_id: n.user_id }))}
          meus={meus}
        />
      </div>

      <Participantes lista={participantes} />
    </div>
  );
}

function Stat({ label, v, cor = "text-zinc-100" }: { label: string; v: string; cor?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <p className={`text-base font-bold ${cor}`}>{v}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
