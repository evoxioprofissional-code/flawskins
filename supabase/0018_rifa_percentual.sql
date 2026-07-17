-- ============================================================
-- Vision Skins :: Migration 0018 — cobrança por % da cota (não mais taxa fixa)
-- A plataforma passa a ganhar uma porcentagem de cada cota (application_fee no
-- Mercado Pago), em vez de uma taxa fixa por rifa criada. Criar rifa passa a
-- exigir só ter o Mercado Pago conectado.
-- ============================================================

-- Percentual da plataforma sobre cada cota (editável). Ex.: '10' = 10%.
insert into public.app_config (key, value) values ('percentual_rifa', '10')
on conflict (key) do nothing;

-- Criar rifa exigindo apenas Mercado Pago conectado (sem consumir crédito).
create or replace function public.rifa_criar_conectado(
  p_titulo text, p_premio text, p_descricao text, p_image_url text,
  p_preco numeric, p_total int
)
returns json language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  conectado boolean;
  pid uuid;
begin
  if uid is null then raise exception 'login necessário'; end if;
  select mp_conectado into conectado from public.profiles where id = uid;
  if not coalesce(conectado, false) then
    raise exception 'conecte sua conta Mercado Pago antes de criar a rifa';
  end if;
  if char_length(trim(p_titulo)) < 3 then raise exception 'título muito curto'; end if;
  if char_length(trim(p_premio)) = 0 then raise exception 'informe o prêmio'; end if;
  if p_preco is null or p_preco < 0 then raise exception 'preço inválido'; end if;
  if p_total is null or p_total < 1 or p_total > 100000 then raise exception 'total inválido'; end if;

  insert into public.rifas (titulo, premio, descricao, image_url, preco_cota, total_numeros, created_by, status)
  values (trim(p_titulo), trim(p_premio), nullif(trim(p_descricao), ''), nullif(p_image_url, ''),
          p_preco, p_total, uid, 'aberta')
  returning id into pid;

  return json_build_object('id', pid);
end;
$$;

revoke all on function public.rifa_criar_conectado(text, text, text, numeric, int) from public;
grant execute on function public.rifa_criar_conectado(text, text, text, numeric, int) to authenticated;
