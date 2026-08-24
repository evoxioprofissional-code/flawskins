-- ============================================================
-- Cloud Skins :: Migration 0021 — comissão de 5% por cota (sem taxa fixa)
-- A plataforma passa a ganhar uma % de cada cota (application_fee no Mercado
-- Pago) em vez da taxa fixa. Criar rifa exige só ter o MP conectado.
-- O % é CONGELADO na criação (rifas.percentual) — mudar o config só afeta novas.
-- ============================================================

-- % padrão da plataforma sobre cada cota (editável). '5' = 5%.
insert into public.app_config (key, value) values ('percentual_rifa', '5')
on conflict (key) do nothing;

-- % congelado por rifa.
alter table public.rifas add column if not exists percentual numeric not null default 5;

-- Criar rifa exigindo só MP conectado (sem taxa/crédito). Cota mínima R$ 5.
create or replace function public.rifa_criar_conectado(
  p_titulo text, p_premio text, p_descricao text, p_image_url text,
  p_preco numeric, p_total int
)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  conectado boolean;
  pct numeric;
  pid uuid;
begin
  if uid is null then raise exception 'login necessário'; end if;
  select mp_conectado into conectado from public.profiles where id = uid;
  if not coalesce(conectado, false) then
    raise exception 'conecte sua conta Mercado Pago antes de criar a rifa';
  end if;
  if char_length(trim(p_titulo)) < 3 then raise exception 'título muito curto'; end if;
  if char_length(trim(p_premio)) = 0 then raise exception 'informe o prêmio'; end if;
  if p_preco is null or p_preco < 5 then raise exception 'a cota mínima é R$ 5,00'; end if;
  if p_total is null or p_total < 1 or p_total > 100000 then raise exception 'total inválido'; end if;

  pct := coalesce((select value::numeric from public.app_config where key = 'percentual_rifa'), 5);

  insert into public.rifas (titulo, premio, descricao, image_url, preco_cota, total_numeros, created_by, status, percentual)
  values (trim(p_titulo), trim(p_premio), nullif(trim(p_descricao), ''), nullif(p_image_url, ''),
          p_preco, p_total, uid, 'aberta', pct)
  returning id into pid;

  return json_build_object('id', pid);
end;
$$;

revoke all on function public.rifa_criar_conectado(text, text, text, numeric, int) from public;
grant execute on function public.rifa_criar_conectado(text, text, text, numeric, int) to authenticated;
