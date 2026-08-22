import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Lock, Box, Layers, Palette, SlidersHorizontal, ShieldCheck, ChevronRight, Store, PackageOpen } from "lucide-react";

import { buscarAnuncio } from "@/actions/anuncios";
import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { AdminDeleteButton } from "@/components/skins/AdminDeleteButton";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { WhatsAppButton } from "@/components/skins/WhatsAppButton";
import { OfferButton } from "@/components/skins/OfferButton";
import { SkinShowcase } from "@/components/skins/SkinShowcase";
import { PrecoBuff } from "@/components/skins/PrecoBuff";
import { getPrecoRef } from "@/lib/precos";
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

  // Skin removida / inexistente: tela amigável em vez de 404 seco.
  if (!anuncio) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4 text-center">
        <div>
          <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/10 bg-neutral-900">
            <PackageOpen className="size-7 text-zinc-500" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-zinc-100">
            Anúncio indisponível
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Esta skin foi removida ou não está mais à venda.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-neutral-800 ring-1 ring-white/10 hover:bg-neutral-700 px-6 text-sm font-semibold text-violet-300 transition-opacity hover:opacity-90"
          >
            Ver outras skins
          </Link>
        </div>
      </div>
    );
  }

  // Perfil do vendedor (avatar) — se o anúncio tiver dono.
  let sellerAvatar: string | null = null;
  if (anuncio.user_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", anuncio.user_id)
      .maybeSingle<{ avatar_url: string | null }>();
    sellerAvatar = data?.avatar_url ?? null;
  }

  const precoRef = await getPrecoRef(anuncio.titulo);

  const imagens = anuncio.image_urls?.length ? anuncio.image_urls : [anuncio.image_url];
  const arma = anuncio.titulo.split("|")[0].trim();
  const inicial = (anuncio.vendedor_nome || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <BackButton className="mb-4" fallback="/" />

      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <ChevronRight className="size-3.5" />
        <span className="text-zinc-400">{arma || anuncio.categoria}</span>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-zinc-300">{anuncio.titulo}</span>
      </nav>

      {/* grid: mobile empilha (imagem → preço → vendedor → histórico) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Imagem */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <SkinShowcase
            imagens={imagens}
            titulo={anuncio.titulo}
            categoria={anuncio.categoria}
            float={anuncio.float_val}
            vendido={anuncio.status === "vendido"}
          />
        </div>

        {/* Preço + detalhes + vendedor (coluna direita no desktop) */}
        <div className="space-y-6 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-5">
            <h1 className="font-display text-xl font-bold tracking-tight text-zinc-50">
              {anuncio.titulo}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-400">{anuncio.exterior}</p>

            <p className="mt-4 text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
              Preço
            </p>
            <p className="font-display text-3xl font-bold text-white">
              {formatBRL(anuncio.preco)}
            </p>

            <PrecoBuff preco={anuncio.preco} dados={precoRef} />

            {/* Detalhes */}
            <dl className="mt-4 divide-y divide-white/5 border-t border-white/5 text-sm">
              {anuncio.float_val != null && (
                <Row icon={SlidersHorizontal} label="Float">
                  <span className="font-mono text-zinc-100">{anuncio.float_val}</span>
                </Row>
              )}
              <Row icon={Box} label="Tipo">
                <span className="text-zinc-100">{anuncio.categoria}</span>
              </Row>
              <Row icon={Layers} label="Desgaste">
                <span className="text-zinc-100">{anuncio.exterior}</span>
              </Row>
              {anuncio.phase && (
                <Row icon={Palette} label="Phase">
                  <span className="text-zinc-100">{anuncio.phase}</span>
                </Row>
              )}
            </dl>

            {/* CTA */}
            <div className="mt-5">
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-4 text-base font-bold text-white transition-colors hover:bg-whatsapp-dark"
                  >
                    <Lock className="size-5" />
                    Cadastre-se para falar com o vendedor
                  </Link>
                  <p className="text-center text-xs text-zinc-500">
                    É rápido e grátis — leva menos de 1 minuto.
                  </p>
                </div>
              )}
            </div>

            {isAdminEmail(user?.email) && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <AdminDeleteButton id={anuncio.id} />
              </div>
            )}
          </div>

          {/* Vendedor */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-base font-bold text-white">
                {sellerAvatar ? (
                  <Image
                    src={sellerAvatar}
                    alt={anuncio.vendedor_nome}
                    width={44}
                    height={44}
                    className="size-11 object-cover"
                  />
                ) : (
                  inicial
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                  Vendedor
                </p>
                <p className="truncate font-semibold text-zinc-100">
                  {anuncio.vendedor_nome}
                </p>
              </div>
            </div>

            <dl className="mt-4 divide-y divide-white/5 border-t border-white/5 text-sm">
              {anuncio.cidade && (
                <Row icon={Store} label="Local">
                  <span className="text-zinc-100">{anuncio.cidade}</span>
                </Row>
              )}
              <Row icon={ShieldCheck} label="Negociação">
                <span className="text-zinc-100">Direto no WhatsApp</span>
              </Row>
            </dl>

            {anuncio.user_id && (
              <Link
                href={`/u/${anuncio.user_id}`}
                className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5"
              >
                Ver itens do vendedor <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Histórico de vendas */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-2">
          <div className="rounded-2xl border border-white/10 bg-neutral-900">
            <h2 className="border-b border-white/10 px-5 py-3.5 text-sm font-semibold text-zinc-100">
              Histórico de vendas
            </h2>
            <div className="grid place-items-center px-4 py-16 text-center">
              <svg className="size-8 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
              <p className="mt-3 text-sm font-medium text-zinc-300">
                Nenhuma venda registrada
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Este item ainda não possui histórico de vendas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="inline-flex items-center gap-2 text-zinc-400">
        <Icon className="size-4 text-zinc-500" />
        {label}
      </span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
