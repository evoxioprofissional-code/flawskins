-- ============================================================
-- Vision Skins :: Migration 0019 — cache de preço de referência (Buff163)
-- Guarda o preço Buff/Steam por skin (market_hash_name). Preenchido sob
-- demanda (quando a skin é vista) via SteamWebAPI, pela service-role.
-- ============================================================

create table if not exists public.skin_precos (
  nome          text primary key,            -- market_hash_name exato
  buff          numeric,                      -- preço Buff163 (BRL)
  steam         numeric,                      -- preço Steam (BRL)
  atualizado_em timestamptz not null default now()
);

alter table public.skin_precos enable row level security;

-- Leitura pública (mostrar o selo). Escrita só via service-role (sem policy).
drop policy if exists skin_precos_read on public.skin_precos;
create policy skin_precos_read on public.skin_precos for select using (true);
