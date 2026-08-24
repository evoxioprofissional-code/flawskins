-- Dashboard "Minhas Rifas": métricas por rifa do criador logado.
-- Retorna contagem de cotas pagas/reservadas + o % congelado da rifa, para o
-- app calcular arrecadação, parte do criador e taxa da plataforma.
create or replace function public.minhas_rifas()
returns table (
  id uuid,
  titulo text,
  premio text,
  image_url text,
  status text,
  preco_cota numeric,
  total_numeros int,
  percentual numeric,
  vencedor_numero int,
  pagos int,
  reservados int,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.titulo,
    r.premio,
    r.image_url,
    r.status::text,
    r.preco_cota,
    r.total_numeros,
    coalesce(r.percentual, 5) as percentual,
    r.vencedor_numero,
    coalesce((select count(*) from public.rifa_numeros n
              where n.rifa_id = r.id and n.status = 'pago'), 0)::int as pagos,
    coalesce((select count(*) from public.rifa_numeros n
              where n.rifa_id = r.id and n.status = 'reservado'), 0)::int as reservados,
    r.created_at
  from public.rifas r
  where r.created_by = auth.uid()
  order by
    case r.status
      when 'aberta' then 0
      when 'encerrada' then 1
      else 2
    end,
    r.created_at desc;
$$;

grant execute on function public.minhas_rifas() to authenticated;
