-- ============================================================
-- Cloud Skins :: Migration 0027 — Saques via NexusPag (subconta da Cloud)
-- Requer a 0025 (carteira). NÃO executa saques: só prepara a estrutura.
--
-- Máquina de estados de carteira_saques:
--   pending ──(reivindicar envio, 1x só)──▶ processing ──▶ completed
--      │                                        │
--      └────────────── failed ◀─────────────────┘   (failed devolve o saldo)
--
-- Regras:
-- - O saldo é RESERVADO na criação (débito no extrato, com trava por usuário).
-- - "pending → processing" acontece ANTES de chamar a NexusPag e só uma vez:
--   um saque em processing nunca é reenviado automaticamente.
-- - Falha devolve ao extrato exatamente o que ainda não foi devolvido
--   (idempotente: referências únicas no extrato).
-- - Transições do provedor só pela service-role (servidor).
-- ============================================================

-- ---------- Limites (privados; só funções lêem app_config) ----------
insert into public.app_config (key, value) values
  ('saque_minimo', '10'),
  ('saque_maximo', '1000'),
  ('saque_diario', '2000')
on conflict (key) do nothing;

-- ---------- Novas colunas ----------
alter table public.carteira_saques add column if not exists correlation_id text;
update public.carteira_saques set correlation_id = 'cs-saque-' || id::text where correlation_id is null;
alter table public.carteira_saques alter column correlation_id set default ('cs-saque-' || gen_random_uuid()::text);
alter table public.carteira_saques alter column correlation_id set not null;
create unique index if not exists carteira_saques_correlation_uidx on public.carteira_saques (correlation_id);

alter table public.carteira_saques add column if not exists pix_key_type text;
alter table public.carteira_saques add column if not exists provider_withdrawal_id text;
create unique index if not exists carteira_saques_provider_uidx
  on public.carteira_saques (provider_withdrawal_id) where provider_withdrawal_id is not null;
alter table public.carteira_saques add column if not exists provider_status text;
alter table public.carteira_saques add column if not exists valor_enviado numeric(12, 2);
alter table public.carteira_saques add column if not exists taxa numeric(12, 2);
alter table public.carteira_saques add column if not exists valor_estornado numeric(12, 2) not null default 0;
alter table public.carteira_saques add column if not exists enviado_em timestamptz;
alter table public.carteira_saques add column if not exists reconciliado_em timestamptz;
alter table public.carteira_saques add column if not exists precisa_revisao boolean not null default false;
alter table public.carteira_saques add column if not exists atualizado_em timestamptz not null default now();

-- ---------- Status novos (converte os da 0025) ----------
do $do$
declare c text;
begin
  for c in
    select con.conname from pg_constraint con
    where con.conrelid = 'public.carteira_saques'::regclass and con.contype = 'c'
      and (pg_get_constraintdef(con.oid) ilike '%status%' or pg_get_constraintdef(con.oid) ilike '%pix_key_type%')
  loop
    execute format('alter table public.carteira_saques drop constraint %I', c);
  end loop;
end
$do$;

update public.carteira_saques set status = case status
  when 'pendente' then 'pending'
  when 'pago' then 'completed'
  when 'recusado' then 'failed'
  else status end;

alter table public.carteira_saques alter column status set default 'pending';
alter table public.carteira_saques add constraint carteira_saques_status_check
  check (status in ('pending', 'processing', 'completed', 'failed'));
alter table public.carteira_saques add constraint carteira_saques_pix_key_type_check
  check (pix_key_type is null or pix_key_type in ('cpf', 'cnpj', 'email', 'phone', 'random'));

create index if not exists carteira_saques_user_status_idx on public.carteira_saques (user_id, status);
create index if not exists carteira_saques_revisao_idx on public.carteira_saques (precisa_revisao) where precisa_revisao;

-- ============================================================
-- Usuário: solicitar saque (valida limites + reserva o saldo)
-- ============================================================
create or replace function public.carteira_saque_solicitar(p_valor numeric, p_chave_pix text, p_tipo text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v numeric := round(p_valor, 2);
  minimo numeric := coalesce((select value::numeric from public.app_config where key = 'saque_minimo'), 10);
  maximo numeric := coalesce((select value::numeric from public.app_config where key = 'saque_maximo'), 1000);
  diario numeric := coalesce((select value::numeric from public.app_config where key = 'saque_diario'), 2000);
  hoje_ini timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  sacado_hoje numeric;
  s record;
begin
  if uid is null then raise exception 'login necessário'; end if;
  if p_tipo is null or p_tipo not in ('cpf', 'cnpj', 'email', 'phone', 'random') then raise exception 'tipo de chave Pix inválido'; end if;
  if p_chave_pix is null or char_length(trim(p_chave_pix)) < 5 or char_length(trim(p_chave_pix)) > 140 then raise exception 'chave Pix inválida'; end if;
  if v is null or v < minimo then raise exception 'o saque mínimo é R$ %', to_char(minimo, 'FM999G990D00'); end if;
  if v > maximo then raise exception 'o saque máximo é R$ % por pedido', to_char(maximo, 'FM999G990D00'); end if;

  perform pg_advisory_xact_lock(hashtext('carteira:' || uid::text));

  if exists (select 1 from public.carteira_saques where user_id = uid and status in ('pending', 'processing')) then
    raise exception 'você já tem um saque em andamento';
  end if;

  select coalesce(sum(valor), 0) into sacado_hoje
  from public.carteira_saques
  where user_id = uid and status <> 'failed' and created_at >= hoje_ini;
  if sacado_hoje + v > diario then
    raise exception 'limite diário de saque é R$ %', to_char(diario, 'FM999G990D00');
  end if;

  if public.carteira_saldo_de(uid) < v then raise exception 'saldo insuficiente'; end if;

  insert into public.carteira_saques (user_id, valor, chave_pix, pix_key_type, status)
  values (uid, v, trim(p_chave_pix), p_tipo, 'pending')
  returning * into s;

  insert into public.carteira_movimentos (user_id, tipo, valor, descricao, referencia)
  values (uid, 'saque', -v, 'Saque para chave Pix (' || p_tipo || ')', s.id::text);

  return json_build_object('id', s.id, 'correlation_id', s.correlation_id, 'valor', s.valor, 'status', s.status);
end;
$$;
revoke all on function public.carteira_saque_solicitar(numeric, text, text) from public;
grant execute on function public.carteira_saque_solicitar(numeric, text, text) to authenticated;

-- A função antiga (sem limites/tipo) deixa de ser usada pelo app.
revoke execute on function public.carteira_solicitar_saque(numeric, text) from authenticated;

-- ============================================================
-- Servidor (service-role): transições do provedor
-- ============================================================

-- pending → processing. Só uma chamada vence; as outras recebem null.
create or replace function public.carteira_saque_reivindicar_envio(p_saque uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  update public.carteira_saques
  set status = 'processing', enviado_em = now(), atualizado_em = now()
  where id = p_saque and status = 'pending' and provider_withdrawal_id is null
  returning * into s;
  if not found then return null; end if;
  return row_to_json(s);
end;
$$;

-- Registra a resposta do provedor (id, status bruto, valor efetivo, taxa, revisão).
create or replace function public.carteira_saque_registrar_envio(
  p_saque uuid, p_provider_id text, p_provider_status text,
  p_valor_enviado numeric, p_taxa numeric, p_revisao boolean, p_nota text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.carteira_saques
  set provider_withdrawal_id = coalesce(provider_withdrawal_id, nullif(p_provider_id, '')),
      provider_status = coalesce(p_provider_status, provider_status),
      valor_enviado = coalesce(p_valor_enviado, valor_enviado),
      taxa = coalesce(p_taxa, taxa),
      precisa_revisao = precisa_revisao or coalesce(p_revisao, false),
      motivo = coalesce(nullif(p_nota, ''), motivo),
      atualizado_em = now()
  where id = p_saque;
  if not found then raise exception 'saque não encontrado'; end if;
end;
$$;

-- Devolve parte do valor (provedor enviou menos que o pedido). Idempotente.
create or replace function public.carteira_saque_estornar_diferenca(p_saque uuid, p_valor_enviado numeric)
returns numeric language plpgsql security definer set search_path = '' as $$
declare s record; diff numeric;
begin
  select * into s from public.carteira_saques where id = p_saque for update;
  if not found then raise exception 'saque não encontrado'; end if;
  diff := round(s.valor - p_valor_enviado, 2) - s.valor_estornado;
  if diff <= 0 then return 0; end if;
  insert into public.carteira_movimentos (user_id, tipo, valor, descricao, referencia)
  values (s.user_id, 'estorno_saque', diff, 'Diferença do saque devolvida', 'ajuste:' || s.id::text)
  on conflict (tipo, referencia) do nothing;
  if found then
    update public.carteira_saques set valor_estornado = valor_estornado + diff, atualizado_em = now() where id = s.id;
  end if;
  return diff;
end;
$$;

-- → completed (idempotente). Se já estava failed, só marca para revisão.
create or replace function public.carteira_saque_concluir(p_saque uuid, p_provider_id text, p_taxa numeric)
returns text language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  select * into s from public.carteira_saques where id = p_saque for update;
  if not found then raise exception 'saque não encontrado'; end if;
  if s.status = 'completed' then return 'ja_concluido'; end if;
  if s.status = 'failed' then
    update public.carteira_saques set precisa_revisao = true, atualizado_em = now(),
      motivo = 'Conflito: provedor confirmou um saque já marcado como falho' where id = s.id;
    return 'conflito';
  end if;
  update public.carteira_saques
  set status = 'completed', processado_em = now(), reconciliado_em = now(), atualizado_em = now(),
      provider_withdrawal_id = coalesce(provider_withdrawal_id, nullif(p_provider_id, '')),
      taxa = coalesce(p_taxa, taxa)
  where id = s.id;
  return 'concluido';
end;
$$;

-- → failed + devolve ao extrato o que ainda não foi devolvido (idempotente).
create or replace function public.carteira_saque_falhar(p_saque uuid, p_motivo text)
returns text language plpgsql security definer set search_path = '' as $$
declare s record; resto numeric;
begin
  select * into s from public.carteira_saques where id = p_saque for update;
  if not found then raise exception 'saque não encontrado'; end if;
  if s.status = 'failed' then return 'ja_falhou'; end if;
  if s.status = 'completed' then
    update public.carteira_saques set precisa_revisao = true, atualizado_em = now(),
      motivo = 'Conflito: falha recebida para saque já concluído' where id = s.id;
    return 'conflito';
  end if;
  resto := s.valor - s.valor_estornado;
  if resto > 0 then
    insert into public.carteira_movimentos (user_id, tipo, valor, descricao, referencia)
    values (s.user_id, 'estorno_saque', resto, 'Saque não realizado (valor devolvido)', s.id::text)
    on conflict (tipo, referencia) do nothing;
  end if;
  update public.carteira_saques
  set status = 'failed', processado_em = now(), reconciliado_em = now(), atualizado_em = now(),
      valor_estornado = s.valor, motivo = coalesce(nullif(trim(p_motivo), ''), motivo)
  where id = s.id;
  return 'falhou';
end;
$$;

create or replace function public.carteira_saque_marcar_revisao(p_saque uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.carteira_saques
  set precisa_revisao = true, motivo = coalesce(nullif(trim(p_motivo), ''), motivo), atualizado_em = now()
  where id = p_saque;
end;
$$;

do $do$
declare f text;
begin
  foreach f in array array[
    'public.carteira_saque_reivindicar_envio(uuid)',
    'public.carteira_saque_registrar_envio(uuid, text, text, numeric, numeric, boolean, text)',
    'public.carteira_saque_estornar_diferenca(uuid, numeric)',
    'public.carteira_saque_concluir(uuid, text, numeric)',
    'public.carteira_saque_falhar(uuid, text)',
    'public.carteira_saque_marcar_revisao(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end
$do$;

-- ============================================================
-- Admin (modo manual, enquanto o envio automático está desligado)
-- ============================================================
create or replace function public.carteira_admin_processar_saque(p_saque uuid, p_aprovar boolean, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  if not public.is_admin() then raise exception 'não autorizado'; end if;
  select * into s from public.carteira_saques where id = p_saque for update;
  if not found then raise exception 'saque não encontrado'; end if;
  if s.status <> 'pending' or s.provider_withdrawal_id is not null then
    raise exception 'só saques na fila (não enviados à NexusPag) podem ser processados manualmente';
  end if;
  if p_aprovar then
    update public.carteira_saques
    set status = 'completed', processado_em = now(), atualizado_em = now(), provider_status = 'manual'
    where id = s.id;
  else
    perform public.carteira_saque_falhar(s.id, coalesce(nullif(trim(p_motivo), ''), 'Recusado pela equipe'));
  end if;
end;
$$;
grant execute on function public.carteira_admin_processar_saque(uuid, boolean, text) to authenticated;
