-- ============================================================
-- FlawSkins :: Migration 0007 — Flaw Arena PRO
-- Novos modos + métricas avançadas (accuracy, combo, reação...).
-- ============================================================

-- Novos modos. (ADD VALUE precisa estar commitado antes de ser usado,
-- por isso fica isolado antes do @@SPLIT@@.)
alter type arena_game add value if not exists 'microflick';
alter type arena_game add value if not exists 'tracking';
alter type arena_game add value if not exists 'peek';
alter type arena_game add value if not exists 'headshot';

-- @@SPLIT@@

-- Métricas avançadas por partida.
alter table public.arena_scores add column if not exists accuracy     numeric;
alter table public.arena_scores add column if not exists hits         int;
alter table public.arena_scores add column if not exists misses       int;
alter table public.arena_scores add column if not exists combo        int;
alter table public.arena_scores add column if not exists reacao_media numeric;
alter table public.arena_scores add column if not exists dificuldade  text;

-- Novo CHECK cobrindo todos os modos.
alter table public.arena_scores drop constraint if exists arena_valor_plausivel;
alter table public.arena_scores add constraint arena_valor_plausivel check (
  (game = 'reflexo' and valor between 50 and 5000) or
  (game <> 'reflexo' and valor between 0 and 100000)
);

-- ============================================================
-- Estatísticas por usuário (todos os modos + métricas)
-- ============================================================
create or replace function public.arena_user_stats(p_user uuid)
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  jogos jsonb := '{}'::jsonb;
  g public.arena_game;
  bestv numeric;
  posv int;
  rating numeric;
  tier text;
  partidas bigint;
  temporadas_disp bigint;
  temporadas_venc bigint;
  best_combo int;
  best_reaction numeric;
  media_acc numeric;
  r_gridshot numeric;
  r_headshot numeric;
  r_reflexo numeric;
begin
  foreach g in array array['reflexo','gridshot','microflick','tracking','peek','headshot']::public.arena_game[] loop
    if g = 'reflexo' then
      select min(valor) into bestv from public.arena_scores where user_id = p_user and game = g;
    else
      select max(valor) into bestv from public.arena_scores where user_id = p_user and game = g;
    end if;
    posv := public.arena_position(p_user, g);
    jogos := jogos || jsonb_build_object(g::text, jsonb_build_object('best', bestv, 'pos', posv));
  end loop;

  select count(*) into partidas from public.arena_scores where user_id = p_user;
  select count(distinct season_id) into temporadas_disp
    from public.arena_scores where user_id = p_user and season_id is not null;
  select count(*) into temporadas_venc
    from public.arena_season_results where user_id = p_user and game is null and posicao = 1;
  select max(combo) into best_combo from public.arena_scores where user_id = p_user;
  select min(valor) into best_reaction from public.arena_scores where user_id = p_user and game = 'reflexo';
  select round(avg(accuracy)) into media_acc from public.arena_scores where user_id = p_user and accuracy is not null;

  select max(valor) into r_gridshot from public.arena_scores where user_id = p_user and game = 'gridshot';
  select max(valor) into r_headshot from public.arena_scores where user_id = p_user and game = 'headshot';
  select min(valor) into r_reflexo  from public.arena_scores where user_id = p_user and game = 'reflexo';

  rating := coalesce(r_gridshot, 0) / 2 + coalesce(r_headshot, 0)
            + case when r_reflexo is not null then greatest(0, 400 - r_reflexo) / 2 else 0 end;

  tier := case
    when rating >= 600 then 'Global'
    when rating >= 420 then 'Águia'
    when rating >= 280 then 'AK'
    when rating >= 170 then 'Ouro'
    when rating >= 80  then 'Prata'
    else 'Bronze'
  end;

  return json_build_object(
    'jogos', jogos,
    'partidas', partidas,
    'temporadas_disputadas', temporadas_disp,
    'temporadas_vencidas', temporadas_venc,
    'streak', public.arena_streak(p_user),
    'best_combo', coalesce(best_combo, 0),
    'best_reaction', best_reaction,
    'media_accuracy', media_acc,
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
-- Conquistas automáticas — agora sobre os 6 modos
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

  foreach g in array array['reflexo','gridshot','microflick','tracking','peek','headshot']::public.arena_game[] loop
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
