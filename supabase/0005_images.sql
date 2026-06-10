-- ============================================================
-- FlawSkins :: Migration 0005 — múltiplas imagens por anúncio
-- image_url continua sendo a capa (1ª imagem); image_urls guarda todas.
-- ============================================================

alter table public.anuncios
  add column if not exists image_urls text[] not null default '{}';

-- Backfill: anúncios antigos passam a ter a capa também no array.
update public.anuncios
set image_urls = array[image_url]
where (image_urls is null or cardinality(image_urls) = 0)
  and image_url is not null;
