-- ============================================================
-- FlawSkins :: Migration 0002 — autenticação
-- Browse é público; ANUNCIAR e CONTATAR exigem login.
-- ============================================================

-- 1) Vincular anúncio ao usuário dono (auth.users)
alter table public.anuncios
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists idx_anuncios_user_id on public.anuncios (user_id);

-- 2) RLS: troca inserção pública por inserção autenticada do próprio dono
drop policy if exists "insercao_publica_anuncios" on public.anuncios;

create policy "insert_proprio_anuncio"
  on public.anuncios
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Dono pode editar/remover (habilita "marcar como vendido" no futuro)
drop policy if exists "update_proprio_anuncio" on public.anuncios;
create policy "update_proprio_anuncio"
  on public.anuncios
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete_proprio_anuncio" on public.anuncios;
create policy "delete_proprio_anuncio"
  on public.anuncios
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Leitura continua pública (feed/detalhe abertos)
-- (policy "leitura_publica_anuncios" permanece como está)

-- 3) Storage: upload de imagens só para autenticados (leitura segue pública)
drop policy if exists "upload_publico_imagens" on storage.objects;

create policy "upload_autenticado_imagens"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'skins');

-- 4) Auto-confirmar email no cadastro (projeto roda SEM verificacao de email).
--    A funcao fica em `public` (o role do pooler nao cria objetos no schema
--    `auth`), mas o trigger pode ser criado em auth.users — mesmo mecanismo do
--    classico handle_new_user. Assim o signUp ja confirma o email no insert e o
--    usuario loga na hora, sem depender do toggle "Confirm email" do painel.
create or replace function public.flawskins_autoconfirm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists flawskins_autoconfirm on auth.users;
create trigger flawskins_autoconfirm
  before insert on auth.users
  for each row execute function public.flawskins_autoconfirm();
