-- ============================================================
-- FlawSkins :: Migration 0014 — marketplace de rifas
-- Usuário paga a taxa (vira crédito) → cria a rifa → cotas caem na
-- conta MP do criador (split). Mostra os participantes.
-- ============================================================

-- Crédito de rifa (1 crédito = 1 rifa que pode ser criada).
alter table public.profiles add column if not exists creditos_rifa int not null default 0;

-- Pagamento agora tem tipo (cota/taxa) e a conta que coleta (criador ou plataforma).
alter table public.rifa_pagamentos alter column rifa_id drop not null;
alter table public.rifa_pagamentos add column if not exists tipo text not null default 'cota'
  check (tipo in ('cota', 'taxa'));
alter table public.rifa_pagamentos add column if not exists mp_conta_user uuid references auth.users (id) on delete set null;

-- Valor da taxa (editável depois).
insert into public.app_config (key, value) values ('taxa_rifa', '3.50')
on conflict (key) do nothing;

-- ============================================================
-- Iniciar a TAXA (gera crédito quando paga). Pix na nossa conta.
-- ============================================================
create or replace function public.rifa_iniciar_taxa()
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  valor numeric;
  pid uuid;
begin
  if uid is null then raise exception 'login necessário'; end if;
  valor := coalesce((select value::numeric from public.app_config where key = 'taxa_rifa'), 3.50);
  insert into public.rifa_pagamentos (rifa_id, user_id, numeros, valor, tipo, status, mp_conta_user)
  values (null, uid, '{}', valor, 'taxa', 'pendente', null)
  returning id into pid;
  return json_build_object('pagamento_id', pid, 'valor', valor);
end;
$$;

-- ============================================================
-- Criar rifa consumindo 1 crédito (exige MP conectado).
-- ============================================================
create or replace function public.rifa_criar_com_credito(
  p_titulo text, p_premio text, p_descricao text, p_image_url text,
  p_preco numeric, p_total int
)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cred int;
  conectado boolean;
  pid uuid;
begin
  if uid is null then raise exception 'login necessário'; end if;
  select creditos_rifa, mp_conectado into cred, conectado from public.profiles where id = uid;
  if not coalesce(conectado, false) then
    raise exception 'conecte sua conta Mercado Pago antes de criar a rifa';
  end if;
  if coalesce(cred, 0) < 1 then
    raise exception 'pague a taxa para liberar a criação da rifa';
  end if;
  if char_length(trim(p_titulo)) < 3 then raise exception 'título muito curto'; end if;
  if char_length(trim(p_premio)) = 0 then raise exception 'informe o prêmio'; end if;
  if p_preco is null or p_preco < 0 then raise exception 'preço inválido'; end if;
  if p_total is null or p_total < 1 or p_total > 100000 then raise exception 'total inválido'; end if;

  insert into public.rifas (titulo, premio, descricao, image_url, preco_cota, total_numeros, created_by, status)
  values (trim(p_titulo), trim(p_premio), nullif(trim(p_descricao), ''), nullif(p_image_url, ''),
          p_preco, p_total, uid, 'aberta')
  returning id into pid;

  update public.profiles set creditos_rifa = creditos_rifa - 1 where id = uid;
  return json_build_object('id', pid);
end;
$$;

-- ============================================================
-- Atualiza iniciar_pagamento de cota: define a conta que coleta
-- (criador, se ele tiver MP conectado; senão a plataforma).
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

  -- quem coleta o dinheiro: criador (se conectado ao MP) ou plataforma (null)
  select user_id into collector from public.mp_contas where user_id = r.created_by;

  valor := array_length(nums, 1) * r.preco_cota;
  insert into public.rifa_pagamentos (rifa_id, user_id, numeros, valor, status, tipo, mp_conta_user)
  values (p_rifa, uid, nums, valor, 'pendente', 'cota', collector)
  returning id into pid;

  return json_build_object('pagamento_id', pid, 'numeros', nums, 'valor', valor);
end;
$$;

-- ============================================================
-- Confirmar pagamento: taxa vira crédito; cota marca os números.
-- ============================================================
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
  else
    update public.rifa_numeros set status = 'pago'
    where rifa_id = pg.rifa_id and numero = any(pg.numeros) and user_id = pg.user_id;
  end if;

  return json_build_object('ok', true);
end;
$$;

-- ============================================================
-- Sortear: agora o CRIADOR também pode sortear a própria rifa.
-- ============================================================
create or replace function public.rifa_sortear(p_rifa uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare ganhador record; dono uuid;
begin
  select created_by into dono from public.rifas where id = p_rifa;
  if not (public.is_admin() or auth.uid() = dono) then raise exception 'not authorized'; end if;

  select numero, user_id into ganhador
  from public.rifa_numeros where rifa_id = p_rifa and status = 'pago'
  order by random() limit 1;
  if not found then raise exception 'nenhuma cota paga para sortear'; end if;

  update public.rifas
  set vencedor_numero = ganhador.numero, vencedor_user_id = ganhador.user_id, status = 'finalizada'
  where id = p_rifa;
  return json_build_object('numero', ganhador.numero, 'user_id', ganhador.user_id);
end;
$$;

-- Encerrar vendas: admin ou o próprio criador.
create or replace function public.rifa_encerrar(p_rifa uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare dono uuid;
begin
  select created_by into dono from public.rifas where id = p_rifa;
  if not (public.is_admin() or auth.uid() = dono) then raise exception 'not authorized'; end if;
  update public.rifas set status = 'encerrada' where id = p_rifa and status = 'aberta';
end;
$$;

grant execute on function public.rifa_iniciar_taxa() to authenticated;
grant execute on function public.rifa_criar_com_credito(text, text, text, text, numeric, int) to authenticated;
grant execute on function public.rifa_encerrar(uuid) to authenticated;
