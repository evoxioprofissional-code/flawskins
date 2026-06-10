// Email do administrador do painel. Deve bater com a função is_admin() no SQL
// (supabase/0004_admin.sql).
export const ADMIN_EMAIL = "flawskinsevox@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
