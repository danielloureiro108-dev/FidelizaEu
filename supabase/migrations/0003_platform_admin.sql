-- ============================================================================
--  Gestão de estabelecimentos pelo super admin — editar, remover, despromover.
--  Rode DEPOIS de 0002_multitenant.sql.
-- ============================================================================

-- ===========================================================================
--  update_tenant — edita marca/estratégia de um estabelecimento existente.
--  Restrito ao super admin. Campos de programa são opcionais (null = mantém).
-- ===========================================================================
create or replace function public.update_tenant(
  p_id              uuid,
  p_name            text,
  p_slug            text,
  p_custom_domain   text default null,
  p_logo_url        text default null,
  p_color_primary   text default null,
  p_color_secondary text default null,
  p_stamps_required int  default null,
  p_reward          text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: apenas super admin';
  end if;

  update public.tenants set
    name            = p_name,
    slug            = lower(p_slug),
    custom_domain   = nullif(p_custom_domain, ''),
    logo_url        = nullif(p_logo_url, ''),
    color_primary   = coalesce(p_color_primary, color_primary),
    color_secondary = coalesce(p_color_secondary, color_secondary),
    color_accent    = coalesce(p_color_secondary, color_accent)
  where id = p_id;

  if p_stamps_required is not null or p_reward is not null then
    update public.loyalty_programs set
      stamps_required    = coalesce(p_stamps_required, stamps_required),
      reward_description = coalesce(p_reward, reward_description)
    where tenant_id = p_id and active = true;
  end if;
end;
$$;

-- ===========================================================================
--  delete_tenant — remove um estabelecimento (e seus programas/cartões/
--  carimbos/recompensas, via ON DELETE CASCADE). Profiles vinculados
--  apenas perdem o tenant_id (ON DELETE SET NULL), não são apagados.
--  Restrito ao super admin.
-- ===========================================================================
create or replace function public.delete_tenant(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: apenas super admin';
  end if;

  delete from public.tenants where id = p_id;
end;
$$;

-- ===========================================================================
--  revoke_admin — despromove um admin de volta a cliente comum.
--  Restrito ao super admin.
-- ===========================================================================
create or replace function public.revoke_admin(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: apenas super admin';
  end if;

  update public.profiles set role = 'customer' where id = p_user_id;
end;
$$;

-- ===========================================================================
--  list_tenant_admins — e-mail + nome dos admins vinculados a um
--  estabelecimento (profiles não guarda e-mail; vem de auth.users).
--  Restrito ao super admin.
-- ===========================================================================
create or replace function public.list_tenant_admins(p_tenant uuid)
returns table(id uuid, email text, full_name text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: apenas super admin';
  end if;

  return query
    select p.id, u.email::text, p.full_name
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.tenant_id = p_tenant and p.role = 'admin';
end;
$$;
