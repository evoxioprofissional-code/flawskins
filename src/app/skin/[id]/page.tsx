import { Suspense, cache, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ChevronRight, Lock, MapPin, PackageOpen, ShieldCheck } from "lucide-react";

import { buscarAnuncio } from "@/actions/anuncios";
import { getUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { AdminDeleteButton } from "@/components/skins/AdminDeleteButton";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { WhatsAppButton } from "@/components/skins/WhatsAppButton";
import { OfferButton } from "@/components/skins/OfferButton";
import { SkinShowcase } from "@/components/skins/SkinShowcase";
import { SkinCard } from "@/components/skins/SkinCard";
import { MercadosComparacao } from "@/components/skins/MercadosComparacao";
import { BackButton } from "@/components/layout/BackButton";
import { getPrecoRef, getPrecosCache } from "@/lib/precos";
import { buscarSimilares } from "@/lib/market-feed";
import { marketRarity, marketSkinTitle } from "@/lib/market-skin";
import { rarityName } from "@/lib/rarities";
import type { Anuncio } from "@/types/database";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Metadata e página compartilham a mesma consulta (uma ida ao banco).
// Erro de banco / id inválido na URL => tela "indisponível" em vez de 500.
const getAnuncio = cache(async (id: string) => {
  try {
    return await buscarAnuncio(id);
  } catch (e) {
    console.error("[skin] falha ao buscar anúncio:", e instanceof Error ? e.message : e);
    return null;
  }
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const anuncio = await getAnuncio(id);
  if (!anuncio) return { title: "Skin não encontrada — Cloud Skins" };
  return { title: `${anuncio.titulo} — Cloud Skins` };
}

const CATEGORIA_PLURAL: Record<string, string> = {
  Faca: "Facas",
  Luva: "Luvas",
  Rifle: "Rifles",
  Pistola: "Pistolas",
  SMG: "SMGs",
  Sniper: "Snipers",
  Outro: "Outros",
};

export default async function SkinPage({ params }: Params) {
  const { id } = await params;
  const [anuncio, user] = await Promise.all([getAnuncio(id), getUser()]);

  if (!anuncio) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4 text-center">
        <div>
          <div className="mx-auto grid size-14 place-items-center cloud-panel">
            <PackageOpen className="size-7 text-zinc-500" />
          </div>
          <h1 className="cloud-page-title mt-4">Anúncio indisponível</h1>
          <p className="mt-1 text-sm text-zinc-400">Esta skin foi removida ou não está mais à venda.</p>
          <Link href="/" className="skin-cta-offer mt-5 inline-flex w-auto px-6">
            Ver outras skins
          </Link>
        </div>
      </div>
    );
  }

  // Avatar do vendedor (se o anúncio tiver dono).
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

  const { weapon, finish } = marketSkinTitle(anuncio.titulo);
  const rarity = marketRarity(anuncio.titulo, anuncio.categoria);
  const raridade = rarityName(rarity);
  const stattrak = /StatTrak/i.test(anuncio.titulo);
  const souvenir = /Souvenir/i.test(anuncio.titulo);
  const arma = weapon.replace(/^(?:★\s*)?(?:StatTrak™?\s*|Souvenir\s*)*/i, "").trim() || weapon;
  const imagens = anuncio.image_urls?.length ? anuncio.image_urls : [anuncio.image_url];
  const inicial = (anuncio.vendedor_nome || "?").trim().charAt(0).toUpperCase();
  const vendido = anuncio.status === "vendido";

  return (
    <div className="skin-page" style={{ "--skin-color": rarity ?? "#e2e7ef" } as CSSProperties}>
      <div className="skin-topbar">
        <BackButton fallback="/" className="skin-back" />
        <nav className="skin-crumbs" aria-label="Navegação">
          <Link href="/">Market</Link>
          <ChevronRight aria-hidden="true" />
          <Link href={`/?categoria=${encodeURIComponent(anuncio.categoria)}`}>
            {CATEGORIA_PLURAL[anuncio.categoria] ?? anuncio.categoria}
          </Link>
          {arma && (
            <>
              <ChevronRight aria-hidden="true" />
              <Link href={`/?q=${encodeURIComponent(arma)}`}>{arma}</Link>
            </>
          )}
        </nav>
      </div>

      <div className="skin-layout">
        <SkinShowcase
          imagens={imagens}
          titulo={anuncio.titulo}
          float={anuncio.float_val}
          exterior={anuncio.exterior}
          vendido={vendido}
        />

        <aside className="skin-side">
          {/* Compra */}
          <section className="skin-buy" aria-label="Comprar">
            <div className="skin-tags">
              {raridade && (
                <span className="skin-tag skin-tag-rarity">
                  <i aria-hidden="true" />
                  {raridade}
                </span>
              )}
              {stattrak && <span className="skin-tag skin-tag-st">StatTrak™</span>}
              {souvenir && <span className="skin-tag skin-tag-souvenir">Souvenir</span>}
              <span className="skin-tag">{anuncio.exterior}</span>
              {anuncio.phase && <span className="skin-tag">{anuncio.phase}</span>}
            </div>

            <p className="skin-weapon">{weapon || anuncio.categoria}</p>
            <h1 className="skin-finish">{finish}</h1>

            <div className="skin-price">
              <span>Preço</span>
              <strong>{formatBRL(anuncio.preco)}</strong>
            </div>

            <div className="skin-actions">
              {vendido ? (
                <p className="skin-sold-note">Esta skin já foi vendida.</p>
              ) : user ? (
                <>
                  <WhatsAppButton whatsapp={anuncio.whatsapp} titulo={anuncio.titulo} preco={anuncio.preco} />
                  <OfferButton whatsapp={anuncio.whatsapp} titulo={anuncio.titulo} preco={anuncio.preco} />
                </>
              ) : (
                <>
                  <Link href={`/cadastro?next=/skin/${anuncio.id}`} className="skin-cta-buy">
                    <Lock className="size-[18px]" />
                    <span>Cadastre-se para falar com o vendedor</span>
                  </Link>
                  <p className="skin-hint">É rápido e grátis, leva menos de 1 minuto.</p>
                </>
              )}
            </div>

            <p className="skin-safe">
              <ShieldCheck aria-hidden="true" />
              Negociação direta com o vendedor pelo WhatsApp.
            </p>

            {isAdminEmail(user?.email) && (
              <div className="mt-4 border-t border-[#1d242e] pt-4">
                <AdminDeleteButton id={anuncio.id} />
              </div>
            )}
          </section>

          {/* Vendedor */}
          <section className="skin-seller" aria-label="Vendedor">
            <span className="skin-seller-avatar">
              {sellerAvatar ? (
                <Image src={sellerAvatar} alt="" width={44} height={44} className="size-11 object-cover" />
              ) : (
                inicial
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="skin-seller-label">Vendedor</p>
              <p className="skin-seller-name">{anuncio.vendedor_nome}</p>
              {anuncio.cidade && (
                <p className="skin-seller-city">
                  <MapPin aria-hidden="true" /> {anuncio.cidade}
                </p>
              )}
            </div>
            {anuncio.user_id && (
              <Link href={`/u/${anuncio.user_id}`} className="skin-seller-link">
                Ver itens <ChevronRight aria-hidden="true" />
              </Link>
            )}
          </section>

          {/* Preços de referência: API externa, carrega sem segurar a página. */}
          <Suspense fallback={<div className="skin-panel skin-panel-loading" aria-hidden="true" />}>
            <PrecosReferencia titulo={anuncio.titulo} preco={anuncio.preco} />
          </Suspense>
        </aside>
      </div>

      <Suspense fallback={null}>
        <Similares anuncio={anuncio} arma={weapon} />
      </Suspense>
    </div>
  );
}

async function PrecosReferencia({ titulo, preco }: { titulo: string; preco: number }) {
  const dados = await getPrecoRef(titulo).catch(() => null);
  return <MercadosComparacao preco={preco} dados={dados} />;
}

async function Similares({ anuncio, arma }: { anuncio: Anuncio; arma: string }) {
  if (!arma) return null;
  const itens = await buscarSimilares(arma, anuncio.id).catch(() => []);
  if (itens.length === 0) return null;
  const precos = await getPrecosCache(itens.map((i) => i.titulo)).catch(() => new Map<string, number>());
  const nome = arma.replace(/^★\s*/, "");

  return (
    <section className="skin-related" aria-label={`Mais ${nome} à venda`}>
      <div className="skin-related-head">
        <h2>Mais {nome} à venda</h2>
        <Link href={`/?q=${encodeURIComponent(nome)}`}>
          Ver todos <ChevronRight aria-hidden="true" />
        </Link>
      </div>
      <div className="skin-related-grid">
        {itens.map((a) => (
          <SkinCard key={a.id} anuncio={a} buff={precos.get(a.titulo) ?? null} />
        ))}
      </div>
    </section>
  );
}
