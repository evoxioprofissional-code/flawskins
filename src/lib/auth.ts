import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// Usuário logado no servidor (ou null). Use em Server Components/Actions.
// `cache` deduplica por request: Header + página compartilham UMA chamada ao
// Supabase Auth (antes cada um fazia a sua ida à rede).
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
