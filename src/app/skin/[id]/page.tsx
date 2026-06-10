import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Lock } from "lucide-react";

import { buscarAnuncio } from "@/actions/anuncios";
import { getUser } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { SellerBlock } from "@/components/skins/SellerBlock";
import { WhatsAppButton } from "@/components/skins/WhatsAppButton";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const anuncio = await buscarAnuncio(id);
  if (!anuncio) return { title: "Skin não encontrada — FlawSkins" };
  return { title: `${anuncio.titulo} — FlawSkins` };
}

export default async function SkinPage({ params }: Params) {
  const { id } = await params;
  const [anuncio, user] = await Promise.all([buscarAnuncio(id), getUser()]);

  if (!anuncio) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5">
      {/* Imagem grande */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <Image
          src={anuncio.image_url}
          alt={anuncio.titulo}
          fill
          sizes="(max-width: 768px) 100vw, 42rem"
          className="object-contain"
          priority
        />
        {anuncio.status === "vendido" && (
          <div className="absolute inset-0 grid place-items-center bg-zinc-950/70">
            <span className="rounded-md border border-zinc-500 px-3 py-1.5 text-sm font-bold tracking-widest text-zinc-100">
              VENDIDO
            </span>
          </div>
        )}
      </div>

      {/* Título */}
      <div className="mt-5">
        <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          Details
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-100 uppercase">
          {anuncio.titulo}
        </h1>
      </div>

      {/* Grid de campos 2x2 */}
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Float" value={anuncio.float_val != null ? String(anuncio.float_val) : "—"} />
        <Field label="Phase" value={anuncio.phase ?? "—"} />
        <Field label="Price" value={formatBRL(anuncio.preco)} highlight />
        <Field label="Exterior" value={anuncio.exterior} />
      </dl>

      {/* Vendedor */}
      <div className="mt-5">
        <SellerBlock nome={anuncio.vendedor_nome} cidade={anuncio.cidade} />
      </div>

      {/* CTA — número do vendedor só é exposto para usuários logados */}
      <div className="mt-6">
        {user ? (
          <WhatsAppButton
            whatsapp={anuncio.whatsapp}
            titulo={anuncio.titulo}
            preco={anuncio.preco}
          />
        ) : (
          <div className="space-y-1.5">
            <Link
              href={`/cadastro?next=/skin/${anuncio.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-4 text-base font-bold text-white shadow-[0_0_24px_-6px] shadow-whatsapp/60 transition-colors hover:bg-whatsapp-dark"
            >
              <Lock className="size-5" />
              CADASTRE-SE PARA FALAR COM O VENDEDOR
            </Link>
            <p className="text-center text-xs text-zinc-500">
              É rápido e grátis — leva menos de 1 minuto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
      <dt className="text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
        {label}
      </dt>
      <dd
        className={
          highlight
            ? "mt-0.5 text-lg font-bold text-orange-400"
            : "mt-0.5 font-medium text-zinc-100"
        }
      >
        {value}
      </dd>
    </div>
  );
}
