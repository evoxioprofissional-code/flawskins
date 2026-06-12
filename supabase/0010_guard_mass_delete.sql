-- ============================================================
-- FlawSkins :: Migration 0010 — proteção contra DELETE em massa
-- Bloqueia apagar muitas linhas de uma vez (acidente de limpeza).
-- Deletes pequenos (1 anúncio, cascade de 1 usuário) seguem normais.
-- Para uma limpeza intencional: set app.allow_purge = 'yes' antes.
-- ============================================================

create or replace function public.guard_bulk_delete()
returns trigger language plpgsql as $$
declare
  n int;
  limite int := 50;
begin
  select count(*) into n from deleted_rows;
  if n > limite
     and coalesce(current_setting('app.allow_purge', true), '') <> 'yes' then
    raise exception
      'DELETE em massa bloqueado: % linhas em % (defina app.allow_purge=''yes'' para limpar de propósito)',
      n, tg_table_name;
  end if;
  return null;
end;
$$;

drop trigger if exists guard_bulk_delete on public.arena_scores;
create trigger guard_bulk_delete
  after delete on public.arena_scores
  referencing old table as deleted_rows
  for each statement execute function public.guard_bulk_delete();

drop trigger if exists guard_bulk_delete on public.arena_achievements;
create trigger guard_bulk_delete
  after delete on public.arena_achievements
  referencing old table as deleted_rows
  for each statement execute function public.guard_bulk_delete();

drop trigger if exists guard_bulk_delete on public.anuncios;
create trigger guard_bulk_delete
  after delete on public.anuncios
  referencing old table as deleted_rows
  for each statement execute function public.guard_bulk_delete();
