-- ============================================================
-- Cloud Skins :: Migration 0020 — guarda todos os mercados por skin
-- A SteamWebAPI já retorna todos os mercados numa chamada; guardamos o
-- breakdown (Buff, CSFloat, Steam, Skinport...) em JSON pra comparação.
-- ============================================================

alter table public.skin_precos add column if not exists mercados jsonb;
