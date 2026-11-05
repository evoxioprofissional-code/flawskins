-- ============================================================
-- Cloud Skins :: Migration 0024 — rifas sem conectar Mercado Pago
-- - Qualquer usuário cria rifa sem conectar conta: TODAS as cotas novas são
--   cobradas na conta Mercado Pago da plataforma.
-- - O criador informa uma chave Pix; a plataforma repassa o líquido
--   (arrecadado − % congelado da rifa) ao encerrar.
-- - A chave Pix fica numa tabela PRIVADA (rifas é pública): só o dono e o
--   admin leem.
-- Rifas antigas (criadas com Mercado Pago conectado) seguem cobrando na conta
-- do criador até terminarem; o app/webhook continua conferindo esses Pix.
-- ============================================================

-- Pré-requisitos (idempotentes): garantem o que a 0024 usa mesmo se alguma
-- migration antiga não tiver sido aplicada neste banco.
alter table public.rifas add column if not exists percentual numeric not null default 5;
insert into public.app_config (key, value) values ('percentual_rifa', '5')
on conflict (key) do nothing;
create table if not exists public.mp_contas (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  access_token text
);
alter table public.mp_contas enable row level security;

create table if not exists public.rifa_repasses (
  rifa_id    uuid primary key references public.rifas(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  chave_pix  text not null check (char_length(trim(chave_pix)) between 5 and 140),
  status     text not null default 'pendente' check (status in ('pendente', 'pago')),
  pago_em    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.rifa_repasses enable row level security;

drop policy if exists rifa_repasses_dono_ler on public.rifa_repasses;
create policy rifa_repasses_dono_ler on public.rifa_repasses
  for select using (user_id = auth.uid() or public.is_admin());

-- O dono pode corrigir a própria chave enquanto o repasse não foi feito.
drop policy if exists rifa_repasses_dono_editar on public.rifa_repasses;
create policy rifa_repasses_dono_editar on public.rifa_repasses
  for update using (user_id = auth.uid() and status = 'pendente')
  with check (user_id = auth.uid() and status = 'pendente');

-- Só o admin marca o repasse como pago.
drop policy if exists rifa_repasses_admin on public.rifa_repasses;
create policy rifa_repasses_admin on public.rifa_repasses
  for update using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- Criar rifa (sem Mercado Pago), já registrando a chave Pix de repasse.
-- ------------------------------------------------------------
create or replace function public.rifa_criar(
  p_titulo text, p_premio text, p_descricao text, p_image_url text,
  p_preco numeric, p_total int, p_chave_pix text
)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  pct numeric;
  pid uuid;
begin
  if uid is null then raise exception 'login necessário'; end if;
  if char_length(trim(p_titulo)) < 3 then raise exception 'título muito curto'; end if;
  if char_length(trim(p_premio)) = 0 then raise exception 'informe o prêmio'; end if;
  if p_preco is null or p_preco < 5 then raise exception 'a cota mínima é R$ 5,00'; end if;
  if p_total is null or p_total < 1 or p_total > 100000 then raise exception 'total inválido'; end if;
  if p_chave_pix is null or char_length(trim(p_chave_pix)) < 5 then
    raise exception 'informe a chave Pix para receber o repasse';
  end if;

  pct := coalesce((select value::numeric from public.app_config where key = 'percentual_rifa'), 5);

  insert into public.rifas (titulo, premio, descricao, image_url, preco_cota, total_numeros, created_by, status, percentual)
  values (trim(p_titulo), trim(p_premio), nullif(trim(p_descricao), ''), nullif(p_image_url, ''),
          p_preco, p_total, uid, 'aberta', pct)
  returning id into pid;

  insert into public.rifa_repasses (rifa_id, user_id, chave_pix)
  values (pid, uid, trim(p_chave_pix));

  return json_build_object('id', pid);
end;
$$;

revoke all on function public.rifa_criar(text, text, text, text, numeric, int, text) from public;
grant execute on function public.rifa_criar(text, text, text, text, numeric, int, text) to authenticated;

-- A criação antiga (que exigia MP conectado) deixa de ser usada.
-- Revoga só se existir, com qualquer assinatura (varia entre bancos).
do $do$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rifa_criar_conectado'
  loop
    execute format('revoke execute on function %s from authenticated', f);
  end loop;
end
$do$;

-- ------------------------------------------------------------
-- Iniciar pagamento de cota: rifas novas cobram na conta da plataforma.
-- (Mesmo corpo da 0014; muda só a escolha de quem coleta.)
-- ------------------------------------------------------------
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
  collector uuid;
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
    with ins as (
      insert into public.rifa_numeros (rifa_id, numero, user_id, status)
      select p_rifa, x.n, uid, 'reservado'
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

  -- Quem coleta: rifas novas (com chave Pix de repasse) => sempre a plataforma.
  -- Rifas antigas, criadas com Mercado Pago conectado e sem repasse cadastrado,
  -- continuam cobrando na conta do criador até terminarem (senão ele ficaria
  -- sem receber e não haveria chave Pix para o repasse).
  if exists (select 1 from public.rifa_repasses rr where rr.rifa_id = p_rifa) then
    collector := null;
  else
    select user_id into collector from public.mp_contas where user_id = r.created_by;
  end if;

  valor := array_length(nums, 1) * r.preco_cota;
  insert into public.rifa_pagamentos (rifa_id, user_id, numeros, valor, status, tipo, mp_conta_user)
  values (p_rifa, uid, nums, valor, 'pendente', 'cota', collector)
  returning id into pid;

  return json_build_object('pagamento_id', pid, 'numeros', nums, 'valor', valor);
end;
$$;
