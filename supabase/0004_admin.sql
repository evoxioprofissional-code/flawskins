-- ============================================================
-- FlawSkins :: Migration 0004 — painel de admin
-- Funções security-definer que só o admin pode chamar. Elas leem
-- auth.users (emails, contagens) sem expor isso a usuários comuns.
-- ============================================================

-- Email do administrador. Troque aqui se mudar o dono do painel.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'flawskinsevox@gmail.com';
$$;

-- Métricas agregadas do marketplace.
create or replace function public.admin_metrics()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result json;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select json_build_object(
    'total_usuarios', (select count(*) from auth.users),
    'total_anuncios', (select count(*) from public.anuncios),
    'anuncios_ativos', (select count(*) from public.anuncios where status = 'ativo'),
    'anuncios_vendidos', (select count(*) from public.anuncios where status = 'vendido'),
    'valor_total_ativo', (select coalesce(sum(preco), 0) from public.anuncios where status = 'ativo'),
    'usuarios_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'anuncios_7d', (select count(*) from public.anuncios where created_at > now() - interval '7 days'),
    'por_categoria', (
      select coalesce(json_object_agg(categoria, c), '{}'::json)
      from (select categoria, count(*) c from public.anuncios group by categoria) s
    )
  ) into result;

  return result;
end;
$$;

-- Lista de usuários com email, perfil e nº de anúncios.
create or replace function public.admin_users()
returns table (
  id             uuid,
  email          text,
  nome           text,
  regiao         text,
  whatsapp       text,
  avatar_url     text,
  criado_em      timestamptz,
  total_anuncios bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select
      u.id,
      u.email::text,
      p.nome,
      p.regiao,
      p.whatsapp,
      p.avatar_url,
      u.created_at,
      (select count(*) from public.anuncios a where a.user_id = u.id)
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_metrics() to authenticated;
grant execute on function public.admin_users() to authenticated;
