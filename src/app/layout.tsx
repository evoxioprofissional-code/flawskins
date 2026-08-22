import type { Metadata } from "next";
import { Inter, Space_Grotesk, Anton } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Fonte de display (títulos): mais caráter que o Inter, look premium.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Fonte de impacto para os grandes títulos (hero): pesada e condensada.
const anton = Anton({
  variable: "--font-impact",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Cloud Skins — Classificados P2P de Skins de CS2",
  description:
    "O classificado definitivo de skins de CS2. Anuncie em segundos e negocie direto no WhatsApp.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // O painel de admin usa layout próprio, sem o chrome do site.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html
      lang="pt-BR"
      className={`dark ${inter.variable} ${spaceGrotesk.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {isAdmin ? (
          <main className="flex-1">{children}</main>
        ) : (
          <>
            <Header />
            {/* pb-20 reserva espaço para a navbar inferior fixa no mobile */}
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <Footer />
            <BottomNav />
          </>
        )}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
