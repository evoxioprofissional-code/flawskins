-- ============================================================
-- Cloud Skins :: Migration 0023 — Cloud E-Sports (PandaScore)
-- Espelho local dos dados de e-sports sincronizados da PandaScore.
-- Todas as entidades guardam o id externo (external_id) da PandaScore;
-- timestamps sempre em UTC (timestamptz).
-- Leitura pública; escrita SOMENTE pela service-role (rota /api/esports/sync).
-- NÃO há tabelas de apostas: o módulo é apenas informativo.
-- ============================================================

create table if not exists public.esports_games (
  id                 smallserial primary key,
  slug               text not null unique,          -- 'cs2', 'valorant'...
  name               text not null,
  provider           text not null default 'pandascore',
  provider_slug      text not null,                 -- slug do videogame no provedor ('cs-go')
  enabled            boolean not null default false,
  created_at         timestamptz not null default now()
);

insert into public.esports_games (slug, name, provider_slug, enabled) values
  ('cs2', 'Counter-Strike 2', 'cs-go', true)
on conflict (slug) do nothing;

create table if not exists public.esports_teams (
  id                 bigserial primary key,
  external_id        bigint not null unique,        -- team.id da PandaScore
  game_slug          text not null references public.esports_games(slug),
  name               text not null,
  acronym            text,
  slug               text,
  location           text,
  logo_url           text,
  provider_modified_at timestamptz,
  synced_at          timestamptz not null default now()
);

create table if not exists public.esports_tournaments (
  id                 bigserial primary key,
  external_id        bigint not null unique,        -- tournament.id da PandaScore
  game_slug          text not null references public.esports_games(slug),
  name               text not null,
  slug               text,
  league_external_id bigint,
  league_name        text,
  league_logo_url    text,
  serie_external_id  bigint,
  serie_name         text,
  tier               text,
  region             text,
  prizepool          text,
  begin_at           timestamptz,
  end_at             timestamptz,
  winner_external_id bigint,
  match_count        integer,
  provider_modified_at timestamptz,
  synced_at          timestamptz not null default now()
);

create table if not exists public.esports_matches (
  id                 bigserial primary key,
  external_id        bigint not null unique,        -- match.id da PandaScore
  game_slug          text not null references public.esports_games(slug),
  tournament_external_id bigint,
  name               text not null default '',
  status             text not null
    check (status in ('scheduled','live','finished','postponed','canceled','unknown')),
  provider_status    text not null,                 -- status bruto (not_started, running...)
  scheduled_at       timestamptz,
  begin_at           timestamptz,
  end_at             timestamptz,
  format             text,                          -- 'BO1', 'BO3', 'BO5'...
  number_of_games    integer,
  team_a_external_id bigint,
  team_b_external_id bigint,
  score_a            integer,
  score_b            integer,
  winner_external_id bigint,
  draw               boolean not null default false,
  forfeit            boolean not null default false,
  games              jsonb not null default '[]'::jsonb, -- resultado por mapa (quando disponível)
  provider_modified_at timestamptz,
  synced_at          timestamptz not null default now()
);

create index if not exists esports_matches_status_idx on public.esports_matches (game_slug, status, scheduled_at);
create index if not exists esports_matches_tournament_idx on public.esports_matches (tournament_external_id);
create index if not exists esports_tournaments_dates_idx on public.esports_tournaments (game_slug, begin_at);

create table if not exists public.esports_sync_logs (
  id                 bigserial primary key,
  provider           text not null default 'pandascore',
  scope              text not null,                 -- 'matches:upcoming', 'tournaments:running'...
  status             text not null check (status in ('success','partial','error')),
  items_received     integer not null default 0,
  items_upserted     integer not null default 0,
  error_kind         text,                          -- 'rate_limited', 'forbidden'... (sem dados sensíveis)
  error_message      text,
  started_at         timestamptz not null,
  finished_at        timestamptz not null default now()
);

create index if not exists esports_sync_logs_started_idx on public.esports_sync_logs (started_at desc);

-- RLS: leitura pública dos dados esportivos; logs e escrita só via service-role.
alter table public.esports_games       enable row level security;
alter table public.esports_teams       enable row level security;
alter table public.esports_tournaments enable row level security;
alter table public.esports_matches     enable row level security;
alter table public.esports_sync_logs   enable row level security;

drop policy if exists esports_games_read on public.esports_games;
create policy esports_games_read on public.esports_games for select using (true);
drop policy if exists esports_teams_read on public.esports_teams;
create policy esports_teams_read on public.esports_teams for select using (true);
drop policy if exists esports_tournaments_read on public.esports_tournaments;
create policy esports_tournaments_read on public.esports_tournaments for select using (true);
drop policy if exists esports_matches_read on public.esports_matches;
create policy esports_matches_read on public.esports_matches for select using (true);
-- esports_sync_logs: sem policy => apenas service-role.
