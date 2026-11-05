import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

// Marca Cloud Skins (wordmark "CLOUD" branca), em public/logo.png.
// `mascot` mostra o mascote (nuvem) ao lado da wordmark — usado no header.
export function Logo({ className, mascot = false }: { className?: string; mascot?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Cloud Skins — início"
      className={cn("flex items-center", mascot && "site-brand", className)}
    >
      {mascot && (
        // O arquivo do mascote tem bastante margem; o wrapper recorta a nuvem.
        <span className="site-brand-mascot" aria-hidden="true">
          <Image src="/esports/mascote.webp" alt="" width={1536} height={1024} priority />
        </span>
      )}
      <Image
        src="/logo.png"
        alt="Cloud Skins"
        width={417}
        height={91}
        priority
        className="h-7 w-auto sm:h-8"
      />
    </Link>
  );
}
