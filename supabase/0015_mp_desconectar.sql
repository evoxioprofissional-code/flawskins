-- ============================================================
-- Vision Skins :: Migration 0015 — desconectar Mercado Pago
-- Remove o token OAuth do criador e baixa a flag mp_conectado.
-- (security definer porque a tabela mp_contas não tem policy de delete.)
-- ============================================================

create or replace function public.mp_desconectar()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login necessário'; end if;
  delete from public.mp_contas where user_id = uid;
  update public.profiles set mp_conectado = false where id = uid;
end;
$$;

revoke all on function public.mp_desconectar() from public;
grant execute on function public.mp_desconectar() to authenticated;
