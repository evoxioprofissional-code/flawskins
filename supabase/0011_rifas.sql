-- ============================================================
-- FlawSkins :: Migration 0011 — Rifas de skins
-- Admin cria a rifa; usuários reservam números; admin confirma
-- pagamento e sorteia. (Pix entra numa fase futura.)
-- ============================================================

do $$ begin
  create type rifa_status as enum ('aberta', 'encerrada', 'finalizada');
exception when duplicate_object then null; end $$;

-- @@SPLIT@@

create table if not exists public.rifas (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null check (char_length(titulo) between 3 and 120),
  premio          text not null,                 -- a skin sorteada
  descricao       text,
  image_url       text,
  preco_cota      numeric(10,2) not null check (preco_cota >= 0),
  total_numeros   int not null check (total_numeros between 1 and 100000),
  status          rifa_status not null default 'aberta',
  vencedor_numero int,
  vencedor_user_id uuid references auth.users (id) on delete set null,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_rifas_status on public.rifas (status, created_at desc);

create table if not exists public.rifa_numeros (
  id         uuid primary key default gen_random_uuid(),
  rifa_id    uuid not null references public.rifas (id) on delete cascade,
  numero     int not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'reservado' check (status in ('reservado', 'pago')),
  created_at timestamptz not null default now(),
  unique (rifa_id, numero)
);
create index if not exists idx_rifa_numeros_rifa on public.rifa_numeros (rifa_id);
create index if not exists idx_rifa_numeros_user on public.rifa_numeros (user_id);

-- View pública com a contagem de cotas vendidas
create or replace view public.rifas_pub as
select r.*,
  (select count(*) from public.rifa_numeros n where n.rifa_id = r.id) as vendidos
from public.rifas r;

-- ============================================================
-- RLS
-- ============================================================
alter table public.rifas enable row level security;
alter table public.rifa_numeros enable row level security;

drop policy if exists rifas_read on public.rifas;
create policy rifas_read on public.rifas for select using (true);

drop policy if exists rifas_admin_write on public.rifas;
create policy rifas_admin_write on public.rifas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists rifa_num_read on public.rifa_numeros;
create policy rifa_num_read on public.rifa_numeros for select using (true);

-- Reserva é feita pela função rifa_reservar (security definer); admin pode tudo.
drop policy if exists rifa_num_admin on public.rifa_numeros;
create policy rifa_num_admin on public.rifa_numeros
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Reservar N números aleatórios disponíveis (atômico)
-- ============================================================
create or replace function public.rifa_reservar(p_rifa uuid, p_qtd int)
returns table (numero int)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r record;
  vendidos int;
begin
  if uid is null then raise exception 'login necessário'; end if;
  if p_qtd is null or p_qtd < 1 or p_qtd > 100 then
    raise exception 'quantidade inválida';
  end if;

  select * into r from public.rifas where id = p_rifa;
  if not found then raise exception 'rifa não encontrada'; end if;
  if r.status <> 'aberta' then raise exception 'rifa não está aberta'; end if;

  -- Serializa reservas concorrentes da mesma rifa.
  perform pg_advisory_xact_lock(hashtext(p_rifa::text));

  select count(*) into vendidos from public.rifa_numeros where rifa_id = p_rifa;
  if vendidos + p_qtd > r.total_numeros then
    raise exception 'cotas insuficientes';
  end if;

  return query
  insert into public.rifa_numeros (rifa_id, numero, user_id, status)
  select p_rifa, avail.n, uid, 'reservado'
  from (
    select disp.n from (
      select g.n from generate_series(1, r.total_numeros) g(n)
      except
      select rn.numero from public.rifa_numeros rn where rn.rifa_id = p_rifa
    ) disp
    order by random()
    limit p_qtd
  ) avail
  returning rifa_numeros.numero;
end;
$$;

-- ============================================================
-- Sortear o vencedor (entre números pagos) — só admin
-- ============================================================
create or replace function public.rifa_sortear(p_rifa uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare
  ganhador record;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  select numero, user_id into ganhador
  from public.rifa_numeros
  where rifa_id = p_rifa and status = 'pago'
  order by random() limit 1;

  if not found then raise exception 'nenhuma cota paga para sortear'; end if;

  update public.rifas
  set vencedor_numero = ganhador.numero,
      vencedor_user_id = ganhador.user_id,
      status = 'finalizada'
  where id = p_rifa;

  return json_build_object('numero', ganhador.numero, 'user_id', ganhador.user_id);
end;
$$;

-- Reservar números ESPECÍFICos escolhidos pelo usuário
create or replace function public.rifa_reservar_numeros(p_rifa uuid, p_numeros int[])
returns table (numero int)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r record;
begin
  if uid is null then raise exception 'login necessário'; end if;
  if p_numeros is null or coalesce(array_length(p_numeros, 1), 0) = 0
     or array_length(p_numeros, 1) > 100 then
    raise exception 'seleção inválida';
  end if;

  select * into r from public.rifas where id = p_rifa;
  if not found then raise exception 'rifa não encontrada'; end if;
  if r.status <> 'aberta' then raise exception 'rifa não está aberta'; end if;

  perform pg_advisory_xact_lock(hashtext(p_rifa::text));

  return query
  insert into public.rifa_numeros (rifa_id, numero, user_id, status)
  select p_rifa, t.x, uid, 'reservado'
  from unnest(p_numeros) as t(x)
  where t.x between 1 and r.total_numeros
  on conflict (rifa_id, numero) do nothing
  returning rifa_numeros.numero;
end;
$$;

grant execute on function public.rifa_reservar(uuid, int) to authenticated;
grant execute on function public.rifa_reservar_numeros(uuid, int[]) to authenticated;
grant execute on function public.rifa_sortear(uuid) to authenticated;
