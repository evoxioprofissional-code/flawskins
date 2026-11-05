"use client";

import { useState } from "react";

import { SkinImage } from "@/components/skins/SkinImage";
import { WearBar } from "@/components/skins/WearBar";

// Palco da skin: imagem grande sobre um fundo levemente tingido pela cor da
// raridade (--skin-color do container), miniaturas e o painel de float.
export function SkinShowcase({
  imagens,
  titulo,
  float,
  exterior,
  vendido,
}: {
  imagens: string[];
  titulo: string;
  float: number | null;
  exterior: string;
  vendido?: boolean;
}) {
  const [ativa, setAtiva] = useState(0);
  const principal = imagens[ativa] ?? imagens[0];

  return (
    <section className="skin-stage" aria-label="Imagens e desgaste">
      <div className="skin-stage-art">
        <SkinImage
          src={principal}
          alt={titulo}
          fit="contain"
          showSteamBackground={false}
          sizes="(max-width: 1024px) 100vw, 760px"
          priority
          imgClassName="skin-stage-img"
        />
        {vendido && (
          <div className="skin-stage-sold">
            <span>Vendido</span>
          </div>
        )}
      </div>

      {imagens.length > 1 && (
        <div className="skin-stage-thumbs" role="tablist" aria-label="Imagens">
          {imagens.map((url, i) => (
            <button
              key={url + i}
              type="button"
              role="tab"
              aria-selected={i === ativa}
              aria-label={`Imagem ${i + 1}`}
              onClick={() => setAtiva(i)}
              className="skin-stage-thumb"
              data-active={i === ativa}
            >
              <SkinImage src={url} alt="" sizes="64px" fit="contain" showSteamBackground={false} />
            </button>
          ))}
        </div>
      )}

      {float != null && (
        <div className="skin-wear">
          <div className="skin-wear-head">
            <span>Float</span>
            <strong>{float}</strong>
            <em>{exterior}</em>
          </div>
          <WearBar float={float} />
        </div>
      )}
    </section>
  );
}
