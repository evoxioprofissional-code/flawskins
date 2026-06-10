import { createClient } from "@/lib/supabase/server";

// Usuário logado no servidor (ou null). Use em Server Components/Actions.
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
