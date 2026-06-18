import { createClient } from "@supabase/supabase-js";

// Cliente com service-role (server-only) — bypassa RLS. Usado só para ler o
// token do Mercado Pago do criador (split) e em webhooks. Nunca no client.
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Access token do Mercado Pago do criador (null se não conectado / sem service-role).
export async function getCreatorToken(userId: string): Promise<string | null> {
  const sb = serviceClient();
  if (!sb) return null;
  const { data } = await sb
    .from("mp_contas")
    .select("access_token")
    .eq("user_id", userId)
    .maybeSingle<{ access_token: string }>();
  return data?.access_token ?? null;
}
