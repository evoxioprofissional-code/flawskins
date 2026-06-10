"use server";

import { createClient } from "@/lib/supabase/server";

export type AdminMetrics = {
  total_usuarios: number;
  total_anuncios: number;
  anuncios_ativos: number;
  anuncios_vendidos: number;
  valor_total_ativo: number;
  usuarios_7d: number;
  anuncios_7d: number;
  por_categoria: Record<string, number>;
};

export type AdminUser = {
  id: string;
  email: string;
  nome: string | null;
  regiao: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  criado_em: string;
  total_anuncios: number;
};

// As funções RPC são security-definer e validam o admin no banco.
export async function getAdminMetrics(): Promise<AdminMetrics | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_metrics");
  if (error) return null;
  return data as AdminMetrics;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_users");
  if (error) return [];
  return (data ?? []) as AdminUser[];
}
