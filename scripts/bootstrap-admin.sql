-- ============================================================================
--  bootstrap-admin.sql
--  Promove o PRIMEIRO usuário a admin/super admin.
--
--  Por quê: grant_admin() e create_tenant() (0002_multitenant.sql) só podem
--  ser chamadas por quem já é super admin — não existe rota de auto-promoção
--  no app. Rode um dos blocos abaixo manualmente no SQL Editor do Supabase
--  (Project > SQL Editor) depois de fazer login pelo menos uma vez no app
--  com a conta que você quer promover.
-- ============================================================================

-- Opção A: dono da plataforma (revendedor) — pode criar estabelecimentos e
-- nomear admins pela tela /platform.
update public.profiles
set is_super_admin = true
where id = (select id from auth.users where email = 'SEU_EMAIL_AQUI');

-- Opção B: admin de UM estabelecimento específico (dono do negócio).
-- Troque SEU_EMAIL_AQUI e o slug do estabelecimento.
update public.profiles
set role = 'admin',
    tenant_id = (select id from public.tenants where slug = 'SLUG_DO_ESTABELECIMENTO')
where id = (select id from auth.users where email = 'SEU_EMAIL_AQUI');
