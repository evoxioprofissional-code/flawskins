-- ============================================================
-- FlawSkins :: Migration 0003 — perfis de usuário
-- Cada usuário tem um perfil editável (foto, região, whatsapp).
-- ============================================================

create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  nome        text,
  avatar_url  text,
  regiao      text,                          -- ex: "São Paulo, SP"
  whatsapp    text,
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Perfis são públicos (para exibir o vendedor); só o dono edita o seu.
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Cria o perfil automaticamente quando um usuário se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, new.raw_user_meta_data ->> 'nome')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: cria perfis para usuários que já existem.
insert into public.profiles (id, nome)
select id, raw_user_meta_data ->> 'nome' from auth.users
on conflict (id) do nothing;

-- ============================================================
-- Storage: bucket público de avatares
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "avatars_upload_auth" on storage.objects;
create policy "avatars_upload_auth"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "avatars_update_auth" on storage.objects;
create policy "avatars_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars');
