import Image from "next/image";

import { cn } from "@/lib/utils";

// Skins importadas da Steam vêm em PNG transparente. Detecta isso para
// renderizar sobre um fundo bonito (gradiente) em vez de cortar a imagem.
export function isSteamImg(url: string): boolean {
  return /steamstatic\.com|steamcommunity\.com/.test(url);
}

type Props = {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  imgClassName?: string;
  // Como ajustar fotos enviadas (a da Steam é sempre "contain" sobre o fundo).
  fit?: "cover" | "contain";
};

// Imagem de skin com preenchimento do container (use dentro de um box relativo).
// Steam (transparente) → fundo gradiente + contain; foto enviada → fit (cover/contain).
export function SkinImage({ src, alt, sizes, priority, imgClassName, fit = "cover" }: Props) {
  const steam = isSteamImg(src);

  return (
    <>
      {steam && (
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(125%_95%_at_50%_8%,#4c2f86_0%,#241a44_38%,#0c0a16_78%)]"
        >
          <span className="absolute inset-x-0 bottom-0 h-1/3 bg-[radial-gradient(60%_100%_at_50%_120%,rgba(217,70,239,0.35),transparent)]" />
        </span>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn(
          steam
            ? "object-contain p-4 drop-shadow-2xl"
            : fit === "contain"
              ? "object-contain"
              : "object-cover",
          imgClassName
        )}
      />
    </>
  );
}
