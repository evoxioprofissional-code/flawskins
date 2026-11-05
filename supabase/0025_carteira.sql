-- ============================================================
-- Cloud Skins :: Migration 0025 — Carteira (saldo do usuário)
-- Extrato imutável (carteira_movimentos): o saldo é SEMPRE a soma dos
-- lançamentos — nunca um número editável. Toda operação de dinheiro passa por
-- funções security definer com trava por usuário (sem corrida de saldo).
--
-- Entradas:  depósito via Pix (conta da plataforma), ganho de rifa liberado
--            pelo admin, estorno de saque recusado.
-- Saídas:    compra de cotas com saldo, pedido de saque (debita na hora;
--            se recusado, volta como estorno).
-- Requer a 0024 (rifa_repasses).
-- ============================================================

-- ---------- Extrato ----------
create table if not exists public.carteira_movimentos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  tipo        text not null check (tipo in ('deposito', 'compra_cota', 'ganho_rifa', 'saque', 'estorno_saque', 'ajuste')),
  valor       numeric(12, 2) not null check (valor <> 0),
  descricao   text not null,
  referencia  text,
  created_at  timestamptz not null default now(),
  unique (tipo, referencia)  -- idempotência: o mesmo evento nunca lança duas vezes
);
create index if not exists idx_carteira_mov_user on public.carteira_movimentos (user_id, created_at desc);

alter table public.carteira_movimentos enable row level security;
drop policy if exists carteira_mov_ler on public.carteira_movimentos;
create policy carteira_mov_ler on public.carteira_movimentos
  for select using (user_id = auth.uid() or public.is_admin());
-- Sem policy de escrita: só as funções abaixo lançam no extrato.

-- ---------- Saques ----------
create table if not exists public.carteira_saques (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  valor         numeric(12, 2) not null check (valor > 0),
  chave_pix     text not null check (char_length(trim(chave_pix)) between 5 and 140),
  status        text not null default 'pendente' check (status in ('pendente', 'pago', 'recusado')),
  motivo        text,
  created_at    timestamptz not null default now(),
  processado_em timestamptz
);
create index if not exists idx_carteira_saques_status on public.carteira_saques (status, created_at);

alter table public.carteira_saques enable row level security;
drop policy if exists carteira_saques_ler on public.carteira_saques;
create policy carteira_saques_ler on public.carteira_saques
  for select using (user_id = auth.uid() or public.is_admin());

-- ---------- Repasse de rifa: guarda o valor e a forma ----------
alter table public.rifa_repasses add column if not exists valor numeric(12, 2);
alter table public.rifa_repasses add column if not exists forma text check (forma in ('pix', 'carteira'));

-- ---------- Depósito usa o mesmo fluxo de Pix das cotas ----------
-- Remove qualquer CHECK antigo sobre "tipo" (o nome pode variar entre bancos).
do $do$
declare c text;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.rifa_pagamentos'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%tipo%'
  loop
    execute format('alter table public.rifa_pagamentos drop constraint %I', c);
  end loop;
end
$do$;
alter table public.rifa_pagamentos add constraint rifa_pagamentos_tipo_check
  check (tipo in ('cota', 'taxa', 'deposito'));

-- ============================================================
-- Helpers
-- ============================================================
create or replace function public.carteira_saldo_de(p_user uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(valor), 0)::numeric(12, 2) from public.carteira_movimentos where user_id = p_user;
$$;
revoke all on function public.carteira_saldo_de(uuid) from public;

-- Líquido de uma rifa (cotas pagas × preço − % congelado).
create or replace function public.rifa_liquido(p_rifa uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(
    round(
      (select count(*) from public.rifa_numeros n where n.rifa_id = r.id and n.status = 'pago')
      * r.preco_cota * (1 - coalesce(r.percentual, 5) / 100.0), 2), 0)
  from public.rifas r where r.id = p_rifa;
$$;
revoke all on function public.rifa_liquido(uuid) from public;

-- ============================================================
-- Resumo para o usuário logado (topo do site e página Carteira)
-- ============================================================
create or replace function public.carteira_resumo()
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return json_build_object('saldo', 0, 'a_receber', 0); end if;
  return json_build_object(
    'saldo', public.carteira_saldo_de(uid),
    'a_receber', coalesce((
      select sum(public.rifa_liquido(rr.rifa_id))
      from public.rifa_repasses rr
      where rr.user_id = uid and rr.status = 'pendente'
    ), 0)
  );
end;
$$;
grant execute on function public.carteira_resumo() to authenticated;

-- ============================================================
-- Depósito (Pix na conta da plataforma)
-- ============================================================
create or replace function public.carteira_iniciar_deposito(p_valor numeric)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  pid uuid;
begin
  if uid is null then raise exception 'login necessário'; end if;
  if p_valor is null or p_valor < 5 then raise exception 'o depósito mínimo é R$ 5,00'; end if;
  if p_valor > 5000 then raise exception 'o depósito máximo é R$ 5.000,00'; end if;
  insert into public.rifa_pagamentos (rifa_id, user_id, numeros, valor, tipo, status, mp_conta_user)
  values (null, uid, '{}', round(p_valor, 2), 'deposito', 'pendente', null)
  returning id into pid;
  return json_build_object('pagamento_id', pid, 'valor', round(p_valor, 2));
end;
$$;
grant execute on function public.carteira_iniciar_deposito(numeric) to authenticated;

-- Confirmação do Pix (webhook / conferência): agora também credita depósitos.
create or replace function public.rifa_confirmar_pagamento(p_mp_id text, p_secret text)
returns json language plpgsql security definer set search_path = '' as $$
declare pg record;
begin
  if p_secret is null or p_secret <> (select value from public.app_config where key = 'mp_webhook_secret') then
    raise exception 'forbidden';
  end if;
  select * into pg from public.rifa_pagamentos where mp_payment_id = p_mp_id;
  if not found then return json_build_object('ok', false); end if;
  if pg.status = 'pago' then return json_build_object('ok', true, 'ja', true); end if;

  update public.rifa_pagamentos set status = 'pago', paid_at = now() where id = pg.id;

  if pg.tipo = 'taxa' then
    update public.profiles set creditos_rifa = creditos_rifa + 1 where id = pg.user_id;
  elsif pg.tipo = 'deposito' then
    insert into public.carteira_movimentos (user_id, tipo, valor, descricao, referencia)
    values (pg.user_id, 'deposito', pg.valor, 'Depósito via Pix', pg.id::text)
    on conflict (tipo, referencia) do nothing;
  else
    update public.rifa_numeros set status = 'pago'
    where rifa_id = pg.rifa_id and numero = any(pg.numeros) and user_id = pg.user_id;
  end if;

  return json_build_object('ok', true);
end;
$$;

-- ============================================================
-- Comprar cotas com saldo (débito na hora, cotas já pagas)
-- ============================================================
create or replace function public.rifa_comprar_com_saldo(
  p_rifa uuid, p_qtd int, p_numeros int[]
)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r record;
  nums int[];
  valor numeric;
  pid uuid;
  saldo numeric;
begin
  if uid is null then raise exception 'login necessário'; end if;
  select * into r from public.rifas where id = p_rifa;
  if not found then raise exception 'rifa não encontrada'; end if;
  if r.status <> 'aberta' then raise exception 'rifa não está aberta'; end if;

  -- Rifas antigas que cobram direto no Mercado Pago do criador não aceitam saldo.
  if not exists (select 1 from public.rifa_repasses rr where rr.rifa_id = p_rifa)
     and exists (select 1 from public.mp_contas mc where mc.user_id = r.created_by) then
    raise exception 'esta rifa aceita apenas pagamento por Pix';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_rifa::text));
  perform pg_advisory_xact_lock(hashtext('carteira:' || uid::text));

  if p_numeros is not null and coalesce(array_length(p_numeros, 1), 0) > 0 then
    if array_length(p_numeros, 1) > 100 then raise exception 'máximo 100 cotas'; end if;
    with ins as (
      insert into public.rifa_numeros (rifa_id, numero, user_id, status)
      select p_rifa, t.x, uid, 'pago'
      from unnest(p_numeros) t(x)
      where t.x between 1 and r.total_numeros
      on conflict (rifa_id, numero) do nothing
      returning numero
    )
    select array_agg(numero) into nums from ins;
  else
    if p_qtd is null or p_qtd < 1 or p_qtd > 100 then raise exception 'quantidade inválida'; end if;
    with ins as (
      insert into public.rifa_numeros (rifa_id, numero, user_id, status)
      select p_rifa, x.n, uid, 'pago'
      from (
        select disp.n from (
          select g.n from generate_series(1, r.total_numeros) g(n)
          except
          select rn.numero from public.rifa_numeros rn where rn.rifa_id = p_rifa
        ) disp
        order by random()
        limit p_qtd
      ) x
      on conflict (rifa_id, numero) do nothing
      returning numero
    )
    select array_agg(numero) into nums from ins;
  end if;

  if nums is null or array_length(nums, 1) is null then
    raise exception 'números indisponíveis, tente outros';
  end if;

  valor := array_length(nums, 1) * r.preco_cota;
  saldo := public.carteira_saldo_de(uid);
  if saldo < valor then
    -- A exceção desfaz a reserva acima (mesma transação).
    raise exception 'saldo insuficiente';
  end if;

  insert into public.rifa_pagamentos (rifa_id, user_id, numeros, valor, status, tipo, mp_conta_user, paid_at)
  values (p_rifa, uid, nums, valor, 'pago', 'cota', null, now())
  returning id into pid;

  insert into public.carteira_movimentos (user_id, tipo, valor, descricao, referencia)
  values (uid, 'compra_cota', -valor,
          'Cotas da rifa ' || r.titulo || ' (' || array_length(nums, 1) || ')', pid::text);

  return json_build_object('pagamento_id', pid, 'numeros', nums, 'valor', valor);
end;
$$;
grant execute on function public.rifa_comprar_com_saldo(uuid, int, int[]) to authenticated;

-- ============================================================
-- Saque (debita na hora; admin paga por Pix ou recusa e estorna)
-- ============================================================
create or replace function public.carteira_solicitar_saque(p_valor numeric, p_chave_pix text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  v numeric := round(p_valor, 2);
begin
  if uid is null then raise exception 'login necessário'; end if;
  if v is null or v < 10 then raise exception 'o saque mínimo é R$ 10,00'; end if;
  if p_chave_pix is null or char_length(trim(p_chave_pix)) < 5 then raise exception 'informe a chave Pix'; end if;

  perform pg_advisory_xact_lock(hashtext('carteira:' || uid::text));
  if public.carteira_saldo_de(uid) < v then raise exception 'saldo insuficiente'; end if;

  insert into public.carteira_saques (user_id, valor, chave_pix)
  values (uid, v, trim(p_chave_pix))
  returning id into sid;

  insert into public.carteira_movimentos (user_id, tipo, valor, descricao, referencia)
  values (uid, 'saque', -v, 'Saque para chave Pix', sid::text);

  return json_build_object('saque_id', sid);
end;
$$;
grant execute on function public.carteira_solicitar_saque(numeric, text) to authenticated;

create or replace function public.carteira_admin_processar_saque(p_saque uuid, p_aprovar boolean, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  if not public.is_admin() then raise exception 'não autorizado'; end if;
  select * into s from public.carteira_saques where id = p_saque for update;
  if not found then raise exception 'saque não encontrado'; end if;
  if s.status <> 'pendente' then raise exception 'saque já processado'; end if;

  if p_aprovar then
    update public.carteira_saques set status = 'pago', processado_em = now() where id = s.id;
  else
    update public.carteira_saques
    set status = 'recusado', processado_em = now(), motivo = nullif(trim(p_motivo), '')
    where id = s.id;
    insert into public.carteira_movimentos (user_id, tipo, valor, descricao, referencia)
    values (s.user_id, 'estorno_saque', s.valor, 'Saque recusado (valor devolvido)', s.id::text)
    on conflict (tipo, referencia) do nothing;
  end if;
end;
$$;
grant execute on function public.carteira_admin_processar_saque(uuid, boolean, text) to authenticated;

-- ============================================================
-- Repasse de rifa: admin libera o líquido na carteira do criador
-- (ou registra que pagou por Pix fora da plataforma).
-- ============================================================
create or replace function public.rifa_liberar_repasse(p_rifa uuid, p_forma text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  rr record;
  v numeric;
begin
  if not public.is_admin() then raise exception 'não autorizado'; end if;
  if p_forma not in ('pix', 'carteira') then raise exception 'forma inválida'; end if;
  select * into rr from public.rifa_repasses where rifa_id = p_rifa for update;
  if not found then raise exception 'repasse não encontrado'; end if;
  if rr.status <> 'pendente' then raise exception 'repasse já feito'; end if;

  v := public.rifa_liquido(p_rifa);
  if p_forma = 'carteira' then
    if v <= 0 then raise exception 'não há valor a liberar'; end if;
    insert into public.carteira_movimentos (user_id, tipo, valor, descricao, referencia)
    values (rr.user_id, 'ganho_rifa', v,
            'Ganhos da rifa ' || (select titulo from public.rifas where id = p_rifa), p_rifa::text)
    on conflict (tipo, referencia) do nothing;
  end if;

  update public.rifa_repasses
  set status = 'pago', pago_em = now(), valor = v, forma = p_forma
  where rifa_id = p_rifa;

  return json_build_object('valor', v);
end;
$$;
grant execute on function public.rifa_liberar_repasse(uuid, text) to authenticated;
