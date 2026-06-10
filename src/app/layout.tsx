import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

export const metadata: Metadata = {
  title: "FlawSkins — Classificados P2P de Skins de CS2",
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
    <html lang="pt-BR" className={`dark ${inter.variable} h-full antialiased`}>
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
