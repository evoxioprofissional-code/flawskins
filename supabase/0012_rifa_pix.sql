-- ============================================================
-- FlawSkins :: Migration 0012 — Pagamento Pix (Mercado Pago)
-- Reserva gera um pagamento Pix; webhook confirma e marca as cotas.
-- ============================================================

create table if not exists public.rifa_pagamentos (
  id            uuid primary key default gen_random_uuid(),
  rifa_id       uuid not null references public.rifas (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  numeros       int[] not null,
  valor         numeric(10,2) not null,
  mp_payment_id text,
  status        text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  qr_copia      text,
  qr_base64     text,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);
create index if not exists idx_rifa_pag_mp on public.rifa_pagamentos (mp_payment_id);
create index if not exists idx_rifa_pag_user on public.rifa_pagamentos (user_id);

alter table public.rifa_pagamentos enable row level security;
drop policy if exists rifa_pag_read_own on public.rifa_pagamentos;
create policy rifa_pag_read_own on public.rifa_pagamentos
  for select using (auth.uid() = user_id or public.is_admin());

-- Config interna (segredo do webhook) — sem acesso por RLS.
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;
-- (sem policies = ninguém lê via API; só funções security-definer acessam)

-- ============================================================
-- Iniciar pagamento: reserva os números e cria o registro de pagamento
-- ============================================================
create or replace function public.rifa_iniciar_pagamento(
  p_rifa uuid, p_qtd int, p_numeros int[]
)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r record;
  nums int[];
  valor numeric;
  pid uuid;
begin
  if uid is null then raise exception 'login necessário'; end if;
  select * into r from public.rifas where id = p_rifa;
  if not found then raise exception 'rifa não encontrada'; end if;
  if r.status <> 'aberta' then raise exception 'rifa não está aberta'; end if;

  perform pg_advisory_xact_lock(hashtext(p_rifa::text));

  if p_numeros is not null and coalesce(array_length(p_numeros, 1), 0) > 0 then
    if array_length(p_numeros, 1) > 100 then raise exception 'máximo 100 cotas'; end if;
    with ins as (
      insert into public.rifa_numeros (rifa_id, numero, user_id, status)
      select p_rifa, t.x, uid, 'reservado'
      from unnest(p_numeros) t(x)
      where t.x between 1 and r.total_numeros
      on conflict (rifa_id, numero) do nothing
      returning numero
    )
    select array_agg(numero) into nums from ins;
  else
    if p_qtd is null or p_qtd < 1 or p_qtd > 100 then raise exception 'quantidade inválida'; end if;
    with disp as (
      select g.n from generate_series(1, r.total_numeros) g(n)
      except
      select rn.numero from public.rifa_numeros rn where rn.rifa_id = p_rifa
    ),
    ins as (
      insert into public.rifa_numeros (rifa_id, numero, user_id, status)
      select p_rifa, x.n, uid, 'reservado'
      from (select n from disp order by random() limit p_qtd) x
      on conflict (rifa_id, numero) do nothing
      returning numero
    )
    select array_agg(numero) into nums from ins;
  end if;

  if nums is null or array_length(nums, 1) is null then
    raise exception 'números indisponíveis, tente outros';
  end if;

  valor := array_length(nums, 1) * r.preco_cota;
  insert into public.rifa_pagamentos (rifa_id, user_id, numeros, valor, status)
  values (p_rifa, uid, nums, valor, 'pendente')
  returning id into pid;

  return json_build_object('pagamento_id', pid, 'numeros', nums, 'valor', valor);
end;
$$;

-- Guarda os dados do Pix no pagamento (só o dono).
create or replace function public.rifa_set_pix(
  p_pagamento uuid, p_mp_id text, p_copia text, p_base64 text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.rifa_pagamentos
  set mp_payment_id = p_mp_id, qr_copia = p_copia, qr_base64 = p_base64
  where id = p_pagamento and user_id = auth.uid();
  if not found then raise exception 'pagamento não encontrado'; end if;
end;
$$;

-- ============================================================
-- Webhook: confirmar / cancelar (protegido por segredo)
-- ============================================================
create or replace function public.rifa_confirmar_pagamento(p_mp_id text, p_secret text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  pg record;
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'mp_webhook_secret') then
    raise exception 'forbidden';
  end if;
  select * into pg from public.rifa_pagamentos where mp_payment_id = p_mp_id;
  if not found then return json_build_object('ok', false, 'motivo', 'pagamento não encontrado'); end if;
  if pg.status = 'pago' then return json_build_object('ok', true, 'ja', true); end if;

  update public.rifa_pagamentos set status = 'pago', paid_at = now() where id = pg.id;
  update public.rifa_numeros set status = 'pago'
  where rifa_id = pg.rifa_id and numero = any(pg.numeros) and user_id = pg.user_id;

  return json_build_object('ok', true, 'rifa_id', pg.rifa_id);
end;
$$;

create or replace function public.rifa_cancelar_pagamento(p_mp_id text, p_secret text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  pg record;
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'mp_webhook_secret') then
    raise exception 'forbidden';
  end if;
  select * into pg from public.rifa_pagamentos where mp_payment_id = p_mp_id;
  if not found then return json_build_object('ok', false); end if;
  if pg.status <> 'pendente' then return json_build_object('ok', true, 'ja', true); end if;

  update public.rifa_pagamentos set status = 'cancelado' where id = pg.id;
  -- Libera os números que ainda estavam só reservados.
  delete from public.rifa_numeros
  where rifa_id = pg.rifa_id and numero = any(pg.numeros)
    and user_id = pg.user_id and status = 'reservado';

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.rifa_iniciar_pagamento(uuid, int, int[]) to authenticated;
grant execute on function public.rifa_set_pix(uuid, text, text, text) to authenticated;
grant execute on function public.rifa_confirmar_pagamento(text, text) to anon, authenticated;
grant execute on function public.rifa_cancelar_pagamento(text, text) to anon, authenticated;
