-- ============================================================
-- FlawSkins :: Migration 0006 — Flaw Arena (competitivo)
-- Minigames, scores, rankings, conquistas, ranks e temporadas.
-- ============================================================

do $$ begin
  create type arena_game as enum ('reflexo', 'gridshot', 'flick');
exception when duplicate_object then null; end $$;

do $$ begin
  create type arena_season_status as enum ('ativa', 'encerrada');
exception when duplicate_object then null; end $$;

-- @@SPLIT@@

-- Temporadas
create table if not exists public.arena_seasons (
  id          uuid primary key default gen_random_uuid(),
  numero      int  not null,
  nome        text not null,
  started_at  timestamptz not null default now(),
  ends_at     timestamptz not null,
  status      arena_season_status not null default 'ativa',
  created_at  timestamptz not null default now()
);

-- Resultados de cada partida (1 linha por jogada)
create table if not exists public.arena_scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  season_id  uuid references public.arena_seasons (id) on delete set null,
  game       arena_game not null,
  valor      numeric not null,
  created_at timestamptz not null default now(),
  -- Anti-trapaça básico: faixas plausíveis por jogo.
  constraint arena_valor_plausivel check (
    (game = 'reflexo' and valor between 50 and 5000) or
    (game in ('gridshot', 'flick') and valor between 0 and 1000)
  )
);
create index if not exists idx_arena_scores_game on public.arena_scores (game, created_at desc);
create index if not exists idx_arena_scores_user on public.arena_scores (user_id);
create index if not exists idx_arena_scores_season on public.arena_scores (season_id);

-- Conquistas / medalhas
create table if not exists public.arena_achievements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code       text not null,
  season_id  uuid references public.arena_seasons (id),
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

-- Snapshot de campeões ao fechar uma temporada
create table if not exists public.arena_season_results (
  id         uuid primary key default gen_random_uuid(),
  season_id  uuid references public.arena_seasons (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete set null,
  game       arena_game,          -- null = ranking geral
  posicao    int,
  valor      numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_arena_results_season on public.arena_season_results (season_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.arena_seasons enable row level security;
alter table public.arena_scores enable row level security;
alter table public.arena_achievements enable row level security;
alter table public.arena_season_results enable row level security;

drop policy if exists arena_seasons_read on public.arena_seasons;
create policy arena_seasons_read on public.arena_seasons for select using (true);

drop policy if exists arena_scores_read on public.arena_scores;
create policy arena_scores_read on public.arena_scores for select using (true);

drop policy if exists arena_scores_insert_own on public.arena_scores;
create policy arena_scores_insert_own on public.arena_scores
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists arena_ach_read on public.arena_achievements;
create policy arena_ach_read on public.arena_achievements for select using (true);
-- Conquistas só são concedidas por função security-definer (sem insert público).

drop policy if exists arena_results_read on public.arena_season_results;
create policy arena_results_read on public.arena_season_results for select using (true);

-- ============================================================
-- Seed: primeira temporada ativa (30 dias)
-- ============================================================
insert into public.arena_seasons (numero, nome, ends_at, status)
select 1, 'Temporada 1', now() + interval '30 days', 'ativa'
where not exists (select 1 from public.arena_seasons);

-- ============================================================
-- Funções auxiliares
-- ============================================================

-- Temporada ativa atual (a mais recente em aberto)
create or replace function public.arena_active_season()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.arena_seasons where status = 'ativa'
  order by started_at desc limit 1;
$$;

-- Posição (all-time) de um usuário num jogo. reflexo: menor é melhor.
create or replace function public.arena_position(p_user uuid, p_game arena_game)
returns int language plpgsql stable security definer set search_path = '' as $$
declare ubest numeric; pos int;
begin
  if p_game = 'reflexo' then
    select min(valor) into ubest from public.arena_scores where user_id = p_user and game = p_game;
    if ubest is null then return null; end if;
    select count(*) + 1 into pos from (
      select user_id, min(valor) m from public.arena_scores where game = p_game group by user_id
    ) t where t.m < ubest;
  else
    select max(valor) into ubest from public.arena_scores where user_id = p_user and game = p_game;
    if ubest is null then return null; end if;
    select count(*) + 1 into pos from (
      select user_id, max(valor) m from public.arena_scores where game = p_game group by user_id
    ) t where t.m > ubest;
  end if;
  return pos;
end;
$$;

-- Streak de dias consecutivos de atividade na Arena
create or replace function public.arena_streak(p_user uuid)
returns int language plpgsql stable security definer set search_path = '' as $$
declare s int := 0; cur date := current_date;
begin
  if not exists (select 1 from public.arena_scores where user_id = p_user and date(created_at) = cur) then
    cur := cur - 1;
  end if;
  while exists (select 1 from public.arena_scores where user_id = p_user and date(created_at) = cur) loop
    s := s + 1; cur := cur - 1;
  end loop;
  return s;
end;
$$;

-- ============================================================
-- Ranking público por jogo e período
-- ============================================================
create or replace function public.arena_ranking(p_game arena_game, p_period text)
returns table (
  user_id uuid, nome text, avatar_url text, best numeric, jogadas bigint, posicao bigint
)
language sql stable security definer set search_path = '' as $$
  with base as (
    select s.user_id,
           case when p_game = 'reflexo' then min(s.valor) else max(s.valor) end as best,
           count(*) as jogadas
    from public.arena_scores s
    where s.game = p_game
      and (
        p_period = 'geral'
        or (p_period = 'dia'    and s.created_at >= date_trunc('day', now()))
        or (p_period = 'semana' and s.created_at >= date_trunc('week', now()))
        or (p_period = 'mes'    and s.created_at >= date_trunc('month', now()))
      )
    group by s.user_id
  )
  select b.user_id, p.nome, p.avatar_url, b.best, b.jogadas,
         row_number() over (
           order by b.best * (case when p_game = 'reflexo' then 1 else -1 end) asc
         ) as posicao
  from base b
  left join public.profiles p on p.id = b.user_id
  order by posicao
  limit 100;
$$;

-- ============================================================
-- Estatísticas da Arena de um usuário (para o perfil)
-- ============================================================
create or replace function public.arena_user_stats(p_user uuid)
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  best_reflexo numeric;
  best_gridshot numeric;
  best_flick numeric;
  rating numeric;
  tier text;
  partidas bigint;
  temporadas_disp bigint;
  temporadas_venc bigint;
begin
  select min(valor) into best_reflexo  from public.arena_scores where user_id = p_user and game = 'reflexo';
  select max(valor) into best_gridshot from public.arena_scores where user_id = p_user and game = 'gridshot';
  select max(valor) into best_flick    from public.arena_scores where user_id = p_user and game = 'flick';
  select count(*) into partidas from public.arena_scores where user_id = p_user;
  select count(distinct season_id) into temporadas_disp
    from public.arena_scores where user_id = p_user and season_id is not null;
  select count(*) into temporadas_venc
    from public.arena_season_results where user_id = p_user and game is null and posicao = 1;

  rating := coalesce(best_gridshot, 0) + coalesce(best_flick, 0)
            + case when best_reflexo is not null then greatest(0, 500 - best_reflexo) / 2 else 0 end;

  tier := case
    when rating >= 350 then 'Global'
    when rating >= 250 then 'Águia'
    when rating >= 170 then 'AK'
    when rating >= 110 then 'Ouro'
    when rating >= 55  then 'Prata'
    else 'Bronze'
  end;

  return json_build_object(
    'best_reflexo', best_reflexo,
    'best_gridshot', best_gridshot,
    'best_flick', best_flick,
    'pos_reflexo', public.arena_position(p_user, 'reflexo'),
    'pos_gridshot', public.arena_position(p_user, 'gridshot'),
    'pos_flick', public.arena_position(p_user, 'flick'),
    'partidas', partidas,
    'temporadas_disputadas', temporadas_disp,
    'temporadas_vencidas', temporadas_venc,
    'streak', public.arena_streak(p_user),
    'rating', round(rating),
    'tier', tier,
    'conquistas', coalesce(
      (select json_agg(code order by created_at) from public.arena_achievements where user_id = p_user),
      '[]'::json
    )
  );
end;
$$;

-- ============================================================
-- Concede conquistas automáticas para o usuário logado
-- (recalcula sempre a partir dos dados reais — não dá pra forjar)
-- ============================================================
create or replace function public.arena_sync_achievements()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  g public.arena_game;
  pos int;
  ads int;
  streak int;
begin
  if uid is null then return; end if;

  foreach g in array array['reflexo','gridshot','flick']::public.arena_game[] loop
    pos := public.arena_position(uid, g);
    if pos is not null then
      if pos <= 100 then
        insert into public.arena_achievements (user_id, code) values (uid, 'top100_' || g)
        on conflict (user_id, code) do nothing;
      end if;
      if pos <= 10 then
        insert into public.arena_achievements (user_id, code) values (uid, 'top10_' || g)
        on conflict (user_id, code) do nothing;
      end if;
      if pos <= 1 then
        insert into public.arena_achievements (user_id, code) values (uid, 'top1_' || g)
        on conflict (user_id, code) do nothing;
      end if;
    end if;
  end loop;

  select count(*) into ads from public.anuncios where user_id = uid;
  if ads >= 100 then
    insert into public.arena_achievements (user_id, code) values (uid, 'ads100')
    on conflict (user_id, code) do nothing;
  end if;

  streak := public.arena_streak(uid);
  if streak >= 7 then
    insert into public.arena_achievements (user_id, code) values (uid, 'streak7')
    on conflict (user_id, code) do nothing;
  end if;
  if streak >= 30 then
    insert into public.arena_achievements (user_id, code) values (uid, 'streak30')
    on conflict (user_id, code) do nothing;
  end if;
end;
$$;

-- ============================================================
-- Fecha uma temporada: snapshot dos campeões, premia o campeão
-- geral e abre a próxima temporada. Só admin.
-- ============================================================
create or replace function public.arena_close_season(p_season uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare
  g public.arena_game;
  champ uuid;
  prox_num int;
  nova uuid;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  -- Top 10 por jogo
  foreach g in array array['reflexo','gridshot','flick']::public.arena_game[] loop
    insert into public.arena_season_results (season_id, user_id, game, posicao, valor)
    select p_season, r.user_id, g, r.posicao, r.best
    from public.arena_ranking(g, 'geral') r
    where r.posicao <= 10;
  end loop;

  -- Campeão geral = quem está em 1º no gridshot (skill principal)
  select user_id into champ from public.arena_ranking('gridshot', 'geral') where posicao = 1;
  if champ is not null then
    insert into public.arena_season_results (season_id, user_id, game, posicao, valor)
    values (p_season, champ, null, 1, null);
    insert into public.arena_achievements (user_id, code, season_id)
    values (champ, 'season_champion', p_season)
    on conflict (user_id, code) do nothing;
  end if;

  update public.arena_seasons set status = 'encerrada' where id = p_season;

  select coalesce(max(numero), 0) + 1 into prox_num from public.arena_seasons;
  insert into public.arena_seasons (numero, nome, ends_at, status)
  values (prox_num, 'Temporada ' || prox_num, now() + interval '30 days', 'ativa')
  returning id into nova;

  return json_build_object('encerrada', p_season, 'campeao', champ, 'nova_temporada', nova);
end;
$$;

grant execute on function public.arena_active_season() to anon, authenticated;
grant execute on function public.arena_position(uuid, arena_game) to anon, authenticated;
grant execute on function public.arena_streak(uuid) to anon, authenticated;
grant execute on function public.arena_ranking(arena_game, text) to anon, authenticated;
grant execute on function public.arena_user_stats(uuid) to anon, authenticated;
grant execute on function public.arena_sync_achievements() to authenticated;
grant execute on function public.arena_close_season(uuid) to authenticated;
