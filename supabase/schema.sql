-- ============================================================
-- FlawSkins :: Schema inicial
-- ============================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- Enums de domínio (controlam valores válidos)
do $$ begin
  create type categoria_skin as enum ('Faca', 'Luva', 'Rifle', 'Pistola', 'SMG', 'Sniper', 'Outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type exterior_skin as enum (
    'Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_anuncio as enum ('ativo', 'vendido');
exception when duplicate_object then null; end $$;

-- Tabela principal
create table if not exists public.anuncios (
  id            uuid            primary key default gen_random_uuid(),
  titulo        text            not null check (char_length(titulo) between 3 and 120),
  categoria     categoria_skin  not null,
  exterior      exterior_skin   not null,
  preco         numeric(10,2)   not null check (preco >= 0),
  whatsapp      text            not null check (whatsapp ~ '^[0-9]{10,13}$'),
  image_url     text            not null,
  status        status_anuncio  not null default 'ativo',
  -- Dados do vendedor (exibidos no bloco SELLER do mockup)
  vendedor_nome text            not null check (char_length(vendedor_nome) between 2 and 60),
  cidade        text,                       -- ex: "São Paulo, SP" (opcional)
  -- Extras de CS2 mostrados na tela de detalhe (opcionais p/ baixa fricção)
  float_val     numeric(6,5)    check (float_val >= 0 and float_val <= 1),
  phase         text,                       -- ex: "Phase 4" (Dopplers)
  created_at    timestamptz     not null default now()
);

-- Índices úteis para o feed
create index if not exists idx_anuncios_created_at on public.anuncios (created_at desc);
create index if not exists idx_anuncios_status     on public.anuncios (status);

-- ============================================================
-- Row Level Security (MVP: leitura e inserção públicas)
-- ============================================================
alter table public.anuncios enable row level security;

-- Qualquer um pode LER anúncios ativos
create policy "leitura_publica_anuncios"
  on public.anuncios
  for select
  using (true);

-- Qualquer um pode INSERIR anúncios (sem login no MVP)
create policy "insercao_publica_anuncios"
  on public.anuncios
  for insert
  with check (true);

-- OBS: NÃO há policy de UPDATE/DELETE público de propósito.
-- Marcar como "vendido" será feito depois, quando houver auth.

-- ============================================================
-- Storage: bucket público para imagens das skins
-- ============================================================
insert into storage.buckets (id, name, public)
values ('skins', 'skins', true)
on conflict (id) do nothing;

-- Leitura pública das imagens
create policy "leitura_publica_imagens"
  on storage.objects for select
  using (bucket_id = 'skins');

-- Upload público de imagens (MVP)
create policy "upload_publico_imagens"
  on storage.objects for insert
  with check (bucket_id = 'skins');
