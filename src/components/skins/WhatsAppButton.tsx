import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/format";

// CTA principal — verde oficial do WhatsApp, com o preço no botão.
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
    <a href={href} target="_blank" rel="noopener noreferrer" className="skin-cta-buy">
      <WhatsAppIcon className="size-5" />
      <span>Comprar via WhatsApp</span>
      <strong>{formatBRL(preco)}</strong>
    </a>
  );
}
