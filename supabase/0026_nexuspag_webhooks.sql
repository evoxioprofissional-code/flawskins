-- ============================================================
-- Cloud Skins :: Migration 0026 — Registro de webhooks da NexusPag
-- Guarda cada evento recebido (já com assinatura HMAC validada) uma única
-- vez: idempotency_key é UNIQUE, então reentregas não duplicam.
--
-- Tabela sensível (contém dados de pagamento): RLS ligado e NENHUMA policy,
-- com privilégios revogados de anon/authenticated. Só o servidor, com a
-- service-role key, lê e grava.
--
-- Nesta etapa os eventos só são registrados: nenhum crédito, depósito,
-- saque ou estorno é executado a partir deles.
-- ============================================================

create table if not exists public.nexuspag_webhook_eventos (
  id                  uuid primary key default gen_random_uuid(),
  idempotency_key     text not null unique,
  evento              text not null,
  recurso_id          text,
  suportado           boolean not null,
  status              text not null default 'registrado'
                        check (status in ('registrado', 'ignorado', 'processado', 'erro')),
  nota                text,
  assinatura_em       timestamptz not null,       -- t= do header (instante assinado pela NexusPag)
  corpo_sha256        text not null,
  payload             jsonb not null,
  recebido_em         timestamptz not null default now(),
  processado_em       timestamptz,
  erro                text
);

create index if not exists nexuspag_webhook_eventos_evento_idx
  on public.nexuspag_webhook_eventos (evento, recebido_em desc);
create index if not exists nexuspag_webhook_eventos_recurso_idx
  on public.nexuspag_webhook_eventos (recurso_id);

alter table public.nexuspag_webhook_eventos enable row level security;
-- Sem policies de propósito: nenhum acesso via API pública.
revoke all on table public.nexuspag_webhook_eventos from anon, authenticated;
