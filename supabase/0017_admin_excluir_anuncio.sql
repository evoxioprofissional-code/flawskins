-- ============================================================
-- Vision Skins :: Migration 0017 — admin exclui anúncio de qualquer usuário
-- A RLS só deixa o dono apagar o próprio; esta RPC (security definer) permite
-- que o admin remova qualquer anúncio.
-- ============================================================

create or replace function public.admin_excluir_anuncio(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'não autorizado';
  end if;
  delete from public.anuncios where id = p_id;
end;
$$;

revoke all on function public.admin_excluir_anuncio(uuid) from public;
grant execute on function public.admin_excluir_anuncio(uuid) to authenticated;
