-- ============================================================
-- FlawSkins :: Migration 0008 — regular as conquistas da Arena
-- Medalhas de posição exigem playerbase mínimo; medalhas de skill
-- têm metas reais e difíceis. (Recalcula sempre dos dados reais.)
-- ============================================================

create or replace function public.arena_sync_achievements()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  g public.arena_game;
  pos int;
  players int;
  partidas int;
  ads int;
  streak int;
  v numeric;
begin
  if uid is null then return; end if;

  -- ---- Medalhas de POSIÇÃO (só com gente suficiente no modo) ----
  foreach g in array array['gridshot','microflick','tracking','peek','headshot','reflexo']::public.arena_game[] loop
    select count(distinct user_id) into players from public.arena_scores where game = g;
    pos := public.arena_position(uid, g);
    if pos is not null then
      if pos = 1   and players >= 10  then
        insert into public.arena_achievements (user_id, code) values (uid, 'top1_'   || g) on conflict do nothing;
      end if;
      if pos <= 10 and players >= 25  then
        insert into public.arena_achievements (user_id, code) values (uid, 'top10_'  || g) on conflict do nothing;
      end if;
      if pos <= 100 and players >= 100 then
        insert into public.arena_achievements (user_id, code) values (uid, 'top100_' || g) on conflict do nothing;
      end if;
    end if;
  end loop;

  -- ---- Medalhas de SKILL (difíceis, mas justas mesmo solo) ----
  -- Reflexo
  select min(valor) into v from public.arena_scores where user_id = uid and game = 'reflexo';
  if v is not null and v <= 250 then
    insert into public.arena_achievements (user_id, code) values (uid, 'reflexo_sub250') on conflict do nothing;
  end if;
  if v is not null and v <= 200 then
    insert into public.arena_achievements (user_id, code) values (uid, 'reflexo_sub200') on conflict do nothing;
  end if;

  -- Combo (em qualquer modo de mira)
  select max(combo) into v from public.arena_scores where user_id = uid;
  if coalesce(v, 0) >= 25 then
    insert into public.arena_achievements (user_id, code) values (uid, 'combo25') on conflict do nothing;
  end if;
  if coalesce(v, 0) >= 50 then
    insert into public.arena_achievements (user_id, code) values (uid, 'combo50') on conflict do nothing;
  end if;

  -- Accuracy (com volume mínimo de acertos)
  if exists (select 1 from public.arena_scores where user_id = uid and accuracy >= 90 and hits >= 20) then
    insert into public.arena_achievements (user_id, code) values (uid, 'sharp90') on conflict do nothing;
  end if;
  if exists (select 1 from public.arena_scores where user_id = uid and accuracy >= 95 and hits >= 25) then
    insert into public.arena_achievements (user_id, code) values (uid, 'sharp95') on conflict do nothing;
  end if;

  -- Volume de partidas
  select count(*) into partidas from public.arena_scores where user_id = uid;
  if partidas >= 50 then
    insert into public.arena_achievements (user_id, code) values (uid, 'veterano') on conflict do nothing;
  end if;
  if partidas >= 250 then
    insert into public.arena_achievements (user_id, code) values (uid, 'maniaco') on conflict do nothing;
  end if;

  -- ---- Atividade / marketplace ----
  select count(*) into ads from public.anuncios where user_id = uid;
  if ads >= 100 then
    insert into public.arena_achievements (user_id, code) values (uid, 'ads100') on conflict do nothing;
  end if;

  streak := public.arena_streak(uid);
  if streak >= 7 then
    insert into public.arena_achievements (user_id, code) values (uid, 'streak7') on conflict do nothing;
  end if;
  if streak >= 30 then
    insert into public.arena_achievements (user_id, code) values (uid, 'streak30') on conflict do nothing;
  end if;
end;
$$;
