import { MessageCircle } from "lucide-react";

import { buildWhatsappLink } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/format";

// CTA de conversão — verde oficial do WhatsApp, com o preço dentro do botão.
export function WhatsAppButton({
  whatsapp,
  titulo,
  preco,
}: {
  whatsapp: string;
  titulo: string;
  preco: number;
}) {
  const href = buildWhatsappLink(whatsapp, titulo, preco);

  return (
    <div className="space-y-1.5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-4 text-base font-bold text-white shadow-[0_0_24px_-6px] shadow-whatsapp/60 transition-colors hover:bg-whatsapp-dark"
      >
        <MessageCircle className="size-5" />
        COMPRAR VIA WHATSAPP ({formatBRL(preco)})
      </a>
      <p className="text-center text-xs text-zinc-500">
        Negocie direto com o vendedor
      </p>
    </div>
  );
}
