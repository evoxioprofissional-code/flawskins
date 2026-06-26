import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Lock } from "lucide-react";

import { buscarAnuncio } from "@/actions/anuncios";
import { getUser } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { SellerBlock } from "@/components/skins/SellerBlock";
import { WhatsAppButton } from "@/components/skins/WhatsAppButton";
import { OfferButton } from "@/components/skins/OfferButton";
import { SkinGallery } from "@/components/skins/SkinGallery";
import { BackButton } from "@/components/layout/BackButton";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const anuncio = await buscarAnuncio(id);
  if (!anuncio) return { title: "Skin não encontrada — Vision Skins" };
  return { title: `${anuncio.titulo} — Vision Skins` };
}

export default async function SkinPage({ params }: Params) {
  const { id } = await params;
  const [anuncio, user] = await Promise.all([buscarAnuncio(id), getUser()]);

  if (!anuncio) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5">
      <BackButton className="mb-4" fallback="/" />
      {/* Galeria de imagens */}
      <SkinGallery
        imagens={
          anuncio.image_urls?.length ? anuncio.image_urls : [anuncio.image_url]
        }
        titulo={anuncio.titulo}
        vendido={anuncio.status === "vendido"}
      />

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
        <SellerBlock
          nome={anuncio.vendedor_nome}
          cidade={anuncio.cidade}
          userId={anuncio.user_id}
        />
      </div>

      {/* CTA — número do vendedor só é exposto para usuários logados */}
      <div className="mt-6">
        {user ? (
          <div className="space-y-3">
            <WhatsAppButton
              whatsapp={anuncio.whatsapp}
              titulo={anuncio.titulo}
              preco={anuncio.preco}
            />
            <OfferButton
              whatsapp={anuncio.whatsapp}
              titulo={anuncio.titulo}
              preco={anuncio.preco}
            />
          </div>
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
            ? "mt-0.5 text-lg font-bold text-fuchsia-400"
            : "mt-0.5 font-medium text-zinc-100"
        }
      >
        {value}
      </dd>
    </div>
  );
}
