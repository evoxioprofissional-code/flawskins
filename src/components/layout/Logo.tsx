import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

// Marca Cloud Skins (coruja + wordmark), imagem oficial em public/logo.png.
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
        width={286}
        height={100}
        priority
        className="h-8 w-auto sm:h-9"
      />
    </Link>
  );
}
