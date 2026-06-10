// Tipos do banco — espelham os enums e a tabela `anuncios` do schema.sql.

export const CATEGORIAS = [
  "Faca",
  "Luva",
  "Rifle",
  "Pistola",
  "SMG",
  "Sniper",
  "Outro",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const EXTERIORES = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
] as const;
export type Exterior = (typeof EXTERIORES)[number];

export const STATUS = ["ativo", "vendido"] as const;
export type Status = (typeof STATUS)[number];

export type Anuncio = {
  id: string;
  titulo: string;
  categoria: Categoria;
  exterior: Exterior;
  preco: number;
  whatsapp: string;
  image_url: string;
  image_urls: string[];
  status: Status;
  user_id: string | null;
  vendedor_nome: string;
  cidade: string | null;
  float_val: number | null;
  phase: string | null;
  created_at: string;
};

// Campos enviados ao criar um anúncio (o restante é gerado pelo banco/storage).
export type NovoAnuncio = Omit<
  Anuncio,
  "id" | "status" | "image_url" | "created_at"
>;

export type Profile = {
  id: string;
  nome: string | null;
  avatar_url: string | null;
  regiao: string | null;
  whatsapp: string | null;
  updated_at: string;
};
