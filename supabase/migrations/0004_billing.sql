-- ============================================================================
--  Cobrança (Stripe) — assinatura mensal por estabelecimento (tenant).
--  Rode DEPOIS de 0003_platform_admin.sql.
-- ============================================================================

alter table public.tenants
  add column if not exists stripe_customer_id     text unique,
  add column if not exists stripe_subscription_id  text unique,
  add column if not exists subscription_status     text not null default 'inactive',
  add column if not exists trial_ends_at           timestamptz,
  add column if not exists plan                    text not null default 'mensal';

-- ===========================================================================
--  SEGURANÇA: os IDs do Stripe e o status da assinatura só podem ser
--  escritos pelo backend (service_role, via webhook do Stripe). Um admin de
--  estabelecimento pode editar sua marca (tenants_update), mas não pode
--  "se autopromover" a assinante ativo pela API pública.
--  (Mesmo padrão já usado para esconder stamp_secret do cliente.)
-- ===========================================================================
revoke select (stripe_customer_id, stripe_subscription_id)
  on public.tenants from anon, authenticated;

revoke update (stripe_customer_id, stripe_subscription_id, subscription_status, trial_ends_at, plan)
  on public.tenants from anon, authenticated;
