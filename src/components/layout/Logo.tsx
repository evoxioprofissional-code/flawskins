import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

// Marca Cloud Skins (wordmark "CLOUD" branca), em public/logo.png.
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Cloud Skins — início"
      className={cn("flex items-center", className)}
    >
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
