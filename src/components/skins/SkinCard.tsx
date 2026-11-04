import Link from "next/link";
import type { CSSProperties } from "react";

import { SkinImage } from "@/components/skins/SkinImage";
import { formatBRL } from "@/lib/format";
import { marketRarity, marketSkinTitle } from "@/lib/market-skin";
import type { Anuncio, Exterior } from "@/types/database";

const WEAR: Record<Exterior, string> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
};

export function SkinCard({ anuncio, buff, offers }: { anuncio: Anuncio; buff?: number | null; offers?: number }) {
  const { weapon, finish } = marketSkinTitle(anuncio.titulo);
  const rarity = marketRarity(anuncio.titulo, anuncio.categoria);
  const diff = buff && buff > 0 ? ((anuncio.preco - buff) / buff) * 100 : null;

  return (
    <Link href={`/skin/${anuncio.id}`} className="skin-card" style={{ "--skin-color": rarity ?? "#e2e7ef" } as CSSProperties}>
      <div className="skin-card-wear">
        <span>{WEAR[anuncio.exterior]}</span>
        {anuncio.float_val != null && <span>{Number(anuncio.float_val).toFixed(4)}</span>}
      </div>
      <div className="skin-card-art">
        <SkinImage
          src={anuncio.image_url}
          alt={anuncio.titulo}
          sizes="(max-width: 600px) 45vw, (max-width: 1100px) 27vw, 15vw"
          fit="contain"
          showSteamBackground={false}
          imgClassName="skin-card-render"
        />
        {anuncio.status === "vendido" && <span className="skin-card-sold">Vendido</span>}
      </div>
      <div className="skin-card-title">
        {weapon && <p>{weapon}</p>}
        <h3>{finish}</h3>
      </div>
      <div className="skin-card-price">
        <strong>{formatBRL(anuncio.preco)}</strong>
        {offers && offers > 1 && <span className="skin-card-offers" title={`${offers} anúncios`}>×{offers}</span>}
        {diff != null && (
          <span className="skin-card-diff" data-discount={diff < 0} title="Comparado ao preço do Buff163">
            {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(diff)}%
          </span>
        )}
      </div>
    </Link>
  );
}
