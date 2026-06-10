import { createClient } from "@/lib/supabase/client";

// Extensão do arquivo a partir do content-type (sem restringir formatos).
export function extFromType(type: string): string {
  const sub = (type.split("/")[1] || "jpg").toLowerCase();
  if (sub === "jpeg") return "jpg";
  return sub.replace(/[^a-z0-9]/g, "") || "jpg";
}

// Sobe um arquivo direto do navegador para um bucket público do Supabase
// (autenticado pela sessão do usuário) e devolve a URL pública.
// Fazer no cliente evita o limite de body das Server Actions / da Vercel,
// então não há restrição prática de tamanho além do limite do bucket.
export async function uploadParaBucket(
  bucket: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Faça login para enviar imagens.");

  const path = `${user.id}/${crypto.randomUUID()}.${extFromType(file.type)}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
