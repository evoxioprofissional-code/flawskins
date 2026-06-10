import { z } from "zod";

import { CATEGORIAS, EXTERIORES } from "@/types/database";
import { sanitizeWhatsapp } from "@/lib/format";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ~5MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Validação da imagem. No SSR `File` não existe, então só validamos
// de fato quando estamos no browser (onde o form realmente roda).
const imagemSchema = z
  .custom<File>((file) => typeof File !== "undefined" && file instanceof File, {
    message: "Selecione uma imagem da skin.",
  })
  .refine((file) => file.size <= MAX_IMAGE_BYTES, {
    message: "A imagem deve ter no máximo 5MB.",
  })
  .refine((file) => IMAGE_TYPES.includes(file.type), {
    message: "Formato inválido. Use JPEG, PNG ou WebP.",
  });

export const anuncioSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, "Mínimo de 3 caracteres.")
    .max(120, "Máximo de 120 caracteres."),
  categoria: z.enum(CATEGORIAS, { message: "Selecione a categoria." }),
  exterior: z.enum(EXTERIORES, { message: "Selecione o exterior (wear)." }),
  preco: z.coerce
    .number({ message: "Informe um preço válido." })
    .positive("O preço deve ser maior que zero."),
  whatsapp: z
    .string()
    .trim()
    .transform(sanitizeWhatsapp)
    .pipe(
      z
        .string()
        .regex(/^[0-9]{10,13}$/, "Informe DDD + número (apenas dígitos).")
    ),
  vendedor_nome: z
    .string()
    .trim()
    .min(2, "Mínimo de 2 caracteres.")
    .max(60, "Máximo de 60 caracteres."),
  cidade: z
    .string()
    .trim()
    .max(80, "Máximo de 80 caracteres.")
    .optional()
    .or(z.literal("")),
  float_val: z.coerce
    .number()
    .min(0, "Float entre 0 e 1.")
    .max(1, "Float entre 0 e 1.")
    .optional(),
  phase: z
    .string()
    .trim()
    .max(40, "Máximo de 40 caracteres.")
    .optional()
    .or(z.literal("")),
  imagem: imagemSchema,
});

export type AnuncioFormValues = z.infer<typeof anuncioSchema>;

// ---- Autenticação ----

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um email válido."),
  senha: z.string().min(6, "A senha precisa de ao menos 6 caracteres."),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const cadastroSchema = loginSchema.extend({
  nome: z
    .string()
    .trim()
    .min(2, "Mínimo de 2 caracteres.")
    .max(60, "Máximo de 60 caracteres."),
});
export type CadastroFormValues = z.infer<typeof cadastroSchema>;

// ---- Perfil ----

export const perfilSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Mínimo de 2 caracteres.")
    .max(60, "Máximo de 60 caracteres."),
  regiao: z
    .string()
    .trim()
    .max(80, "Máximo de 80 caracteres.")
    .optional()
    .or(z.literal("")),
  whatsapp: z
    .string()
    .trim()
    .transform(sanitizeWhatsapp)
    .pipe(
      z
        .string()
        .regex(/^[0-9]{10,13}$/, "Informe DDD + número (apenas dígitos).")
    )
    .optional()
    .or(z.literal("")),
});
export type PerfilFormValues = z.infer<typeof perfilSchema>;
