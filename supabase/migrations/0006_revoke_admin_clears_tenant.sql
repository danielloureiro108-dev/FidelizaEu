-- ============================================================================
--  revoke_admin também limpa o tenant_id — evita vínculo residual.
--  Rode DEPOIS de 0005_redeem_reward.sql.
--
--  Antes, revoke_admin só voltava role para 'customer' e deixava tenant_id
--  apontando pro estabelecimento de onde a pessoa foi removida. Isso por si
--  só já era inofensivo (RLS usa role+tenant_id juntos via is_admin_of), mas
--  deixava dado órfão e mascarava o sintoma real: a tela /admin (camada de
--  app) só checava role="admin", sem confirmar que o tenant_id do profile
--  batia com o estabelecimento sendo acessado — corrigido em
--  src/app/admin/layout.tsx.
-- ============================================================================

create or replace function public.revoke_admin(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: apenas super admin';
  end if;

  update public.profiles
    set role = 'customer', tenant_id = null
    where id = p_user_id;
end;
$$;
