import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para o servidor (Server Components e Server Actions).
// No MVP não há auth, mas mantemos o padrão de cookies do @supabase/ssr
// para já estar pronto quando a autenticação entrar na v2.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` chamado de um Server Component — pode ser ignorado
            // quando há middleware cuidando da sessão (futuro, com auth).
          }
        },
      },
    }
  );
}
