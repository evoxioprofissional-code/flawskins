-- ============================================================
-- FlawSkins :: Migration 0009 — Pro Player Lab
-- Guarda qual mira/preset foi usada em cada partida + miras da comunidade.
-- ============================================================

alter table public.arena_scores add column if not exists preset text;
create index if not exists idx_arena_scores_preset on public.arena_scores (preset);

-- Miras criadas pela comunidade
create table if not exists public.arena_community_crosshairs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  nome       text not null check (char_length(nome) between 2 and 40),
  config     jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_arena_cc_user on public.arena_community_crosshairs (user_id);

alter table public.arena_community_crosshairs enable row level security;

drop policy if exists arena_cc_read on public.arena_community_crosshairs;
create policy arena_cc_read on public.arena_community_crosshairs for select using (true);

drop policy if exists arena_cc_insert_own on public.arena_community_crosshairs;
create policy arena_cc_insert_own on public.arena_community_crosshairs
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists arena_cc_delete_own on public.arena_community_crosshairs;
create policy arena_cc_delete_own on public.arena_community_crosshairs
  for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- Ranking de presets mais usados
-- ============================================================
create or replace function public.arena_preset_ranking()
returns table (preset text, usos bigint, pct numeric)
language sql stable security definer set search_path = '' as $$
  select preset,
         count(*) as usos,
         round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as pct
  from public.arena_scores
  where preset is not null
  group by preset
  order by usos desc
  limit 20;
$$;

-- Preset dominante entre os melhores jogadores (top 100 do gridshot)
create or replace function public.arena_top_preset()
returns json language plpgsql stable security definer set search_path = '' as $$
declare res json;
begin
  with top_users as (
    select user_id, max(valor) best
    from public.arena_scores where game = 'gridshot'
    group by user_id order by best desc limit 100
  ),
  mains as (
    select s.user_id, s.preset, count(*) c,
           row_number() over (partition by s.user_id order by count(*) desc) rn
    from public.arena_scores s
    join top_users t on t.user_id = s.user_id
    where s.preset is not null
    group by s.user_id, s.preset
  ),
  agg as (
    select preset, count(*) usuarios from mains where rn = 1 group by preset
  )
  select json_build_object(
    'preset', (select preset from agg order by usuarios desc limit 1),
    'pct', (select round(100.0 * max(usuarios) / nullif(sum(usuarios), 0)) from agg),
    'total', coalesce((select sum(usuarios) from agg), 0)
  ) into res;
  return res;
end;
$$;

-- Desempenho do usuário por preset, num jogo
create or replace function public.arena_my_preset_stats(p_user uuid, p_game arena_game)
returns table (preset text, best numeric, media_acc numeric, partidas bigint)
language sql stable security definer set search_path = '' as $$
  select preset,
         max(valor) as best,
         round(avg(accuracy)) as media_acc,
         count(*) as partidas
  from public.arena_scores
  where user_id = p_user and game = p_game and preset is not null
  group by preset
  order by best desc;
$$;

grant execute on function public.arena_preset_ranking() to anon, authenticated;
grant execute on function public.arena_top_preset() to anon, authenticated;
grant execute on function public.arena_my_preset_stats(uuid, arena_game) to anon, authenticated;
