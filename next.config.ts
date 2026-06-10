import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Esconde o indicador de desenvolvimento do Next (o "N" no canto).
  devIndicators: false,
  // Há um package-lock.json no diretório pai; fixamos a raiz neste projeto.
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        // Imagens das skins servidas pelo Supabase Storage (bucket público)
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
