import { formatBRL } from "@/lib/format";
import { sanitizeWhatsapp } from "@/lib/format";

// Garante o DDI 55 (Brasil) na frente do número, se ainda não houver.
function comDDI(numero: string): string {
  const digits = sanitizeWhatsapp(numero);
  return digits.startsWith("55") ? digits : `55${digits}`;
}

// Monta o link wa.me com a mensagem do comprador pré-preenchida.
export function buildWhatsappLink(
  whatsapp: string,
  titulo: string,
  preco: number
): string {
  const numero = comDDI(whatsapp);
  const mensagem = `Olá! Tenho interesse na skin "${titulo}" (${formatBRL(
    preco
  )}) que você anunciou no Vision Skins. Ainda está disponível?`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

// Monta o link wa.me com uma OFERTA (lance) do comprador.
export function buildLanceLink(
  whatsapp: string,
  titulo: string,
  preco: number,
  lance: number
): string {
  const numero = comDDI(whatsapp);
  const mensagem = `Olá! Vi sua skin "${titulo}" anunciada por ${formatBRL(
    preco
  )} no Vision Skins. Quero fazer um lance de ${formatBRL(
    lance
  )}. Podemos negociar?`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

type AnuncioTextInput = {
  titulo: string;
  categoria: string;
  exterior: string;
  preco: number;
  float_val?: number | null;
  phase?: string | null;
  cidade?: string | null;
};

// Texto formatado para o vendedor colar nos grupos de WhatsApp.
export function buildAnuncioText(a: AnuncioTextInput): string {
  const linhas = [
    `🔥 ${a.titulo}`,
    ``,
    `🎯 Categoria: ${a.categoria}`,
    `🧪 Exterior: ${a.exterior}`,
  ];

  if (a.float_val != null) linhas.push(`📊 Float: ${a.float_val}`);
  if (a.phase) linhas.push(`💠 Phase: ${a.phase}`);
  if (a.cidade) linhas.push(`📍 ${a.cidade}`);

  linhas.push(``, `💰 ${formatBRL(a.preco)}`, ``, `Anunciado no Vision Skins.`);

  return linhas.join("\n");
}
