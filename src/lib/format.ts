// Formata um número como moeda brasileira (R$).
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Remove tudo que não for dígito de um número de WhatsApp
// (parênteses, traços, espaços, "+", etc.).
export function sanitizeWhatsapp(raw: string): string {
  return raw.replace(/\D/g, "");
}
