-- ============================================================
-- FlawSkins :: Migration 0013 — conexão Mercado Pago do criador
-- Guarda o token OAuth do criador (para o dinheiro das cotas cair na
-- conta DELE). Tokens nunca são lidos via API (sem policy de select).
-- ============================================================

create table if not exists public.mp_contas (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  mp_user_id    text,
  access_token  text not null,
  refresh_token text,
  public_key    text,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now()
);

alter table public.mp_contas enable row level security;

-- O dono pode gravar a própria conexão; NINGUÉM lê os tokens via API.
drop policy if exists mp_contas_insert_own on public.mp_contas;
create policy mp_contas_insert_own on public.mp_contas
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists mp_contas_update_own on public.mp_contas;
create policy mp_contas_update_own on public.mp_contas
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (sem policy de select = tokens ficam protegidos)

-- Flag pública de "conta conectada" (sem expor o token).
alter table public.profiles add column if not exists mp_conectado boolean not null default false;
