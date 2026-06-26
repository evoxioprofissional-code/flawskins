-- ============================================================
-- Vision Skins :: Migration 0016 — login com Steam
-- Guarda o steamid no perfil e vincula após a sessão ser criada.
-- O login em si é feito via OpenID da Steam + service-role (no servidor).
-- ============================================================

alter table public.profiles add column if not exists steam_id text;

-- Cada steamid pertence a no máximo um perfil.
create unique index if not exists profiles_steam_id_key
  on public.profiles (steam_id) where steam_id is not null;

-- Vincula o steamid ao usuário logado e preenche nome/avatar se ainda vazios.
create or replace function public.steam_vincular(
  p_steam_id text, p_nome text, p_avatar text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login necessário'; end if;
  update public.profiles
  set steam_id   = p_steam_id,
      nome       = coalesce(nullif(nome, ''), nullif(p_nome, '')),
      avatar_url = coalesce(nullif(avatar_url, ''), nullif(p_avatar, '')),
      updated_at = now()
  where id = uid;
end;
$$;

revoke all on function public.steam_vincular(text, text, text) from public;
grant execute on function public.steam_vincular(text, text, text) to authenticated;
