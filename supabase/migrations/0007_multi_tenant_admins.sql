-- ============================================================================
--  Admin multi-estabelecimento — o mesmo e-mail pode administrar vários
--  slugs. Antes, "admin de qual tenant" vivia em profiles.role/tenant_id
--  (1 valor só por usuário): nomear alguém admin de um 2º estabelecimento
--  sobrescrevia o vínculo do 1º. Agora isso é uma tabela N:N; profiles
--  mantém tenant_id só como o tenant "casa" do cliente (attach_customer),
--  sem relação com permissão de admin.
--  Rode DEPOIS de 0006_revoke_admin_clears_tenant.sql.
-- ============================================================================

create table if not exists public.tenant_admins (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index if not exists idx_tenant_admins_user on public.tenant_admins(user_id);

alter table public.tenant_admins enable row level security;

drop policy if exists tenant_admins_self_read on public.tenant_admins;
create policy tenant_admins_self_read on public.tenant_admins for select
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists tenant_admins_super_all on public.tenant_admins;
create policy tenant_admins_super_all on public.tenant_admins for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Migra os vínculos existentes (role='admin' + tenant_id único) para a nova
-- tabela antes de parar de depender deles.
insert into public.tenant_admins (tenant_id, user_id)
select tenant_id, id from public.profiles
where role = 'admin' and tenant_id is not null
on conflict (tenant_id, user_id) do nothing;

-- ===========================================================================
--  is_admin_of — agora consulta tenant_admins em vez de profiles.tenant_id.
--  Usada por toda a RLS (tenants, loyalty_programs, cards, stamps, rewards),
--  então essa troca já corrige o acesso em todo o app.
-- ===========================================================================
create or replace function public.is_admin_of(p_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_admins
    where tenant_id = p_tenant and user_id = auth.uid()
  );
$$;

-- ===========================================================================
--  grant_admin — nomeia um usuário (por e-mail) admin de um tenant, SEM
--  afetar vínculos de admin que ele já tenha em outros estabelecimentos.
--  Restrito ao super admin.
-- ===========================================================================
create or replace function public.grant_admin(p_email text, p_tenant uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: apenas super admin';
  end if;

  select id into v_uid from auth.users where email = lower(p_email);
  if v_uid is null then return false; end if;

  insert into public.tenant_admins (tenant_id, user_id)
  values (p_tenant, v_uid)
  on conflict (tenant_id, user_id) do nothing;

  -- Flag informativa (usada só pro redirect grosseiro de "/"); a autorização
  -- de verdade é sempre via tenant_admins/is_admin_of.
  update public.profiles set role = 'admin' where id = v_uid;

  return true;
end;
$$;

-- ===========================================================================
--  revoke_admin — agora tira o admin de UM estabelecimento específico
--  (antes despromovia de todos, já que só havia um vínculo possível).
--  Assinatura mudou (ganhou p_tenant): remove a versão antiga primeiro,
--  senão "create or replace" cria uma sobrecarga e deixa a função velha
--  (que zerava role em todos os tenants) viva no banco.
--  Restrito ao super admin.
-- ===========================================================================
drop function if exists public.revoke_admin(uuid);

create or replace function public.revoke_admin(p_user_id uuid, p_tenant uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: apenas super admin';
  end if;

  delete from public.tenant_admins
    where tenant_id = p_tenant and user_id = p_user_id;

  -- Só volta a "customer" se não sobrar nenhum outro estabelecimento.
  update public.profiles set role = 'customer'
    where id = p_user_id
      and not exists (
        select 1 from public.tenant_admins where user_id = p_user_id
      );
end;
$$;

-- ===========================================================================
--  list_tenant_admins — agora lista via tenant_admins (join com auth.users
--  pro e-mail e profiles pro nome, que pode ser nulo se o profile sumir).
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
    select u.id, u.email::text, p.full_name
    from public.tenant_admins ta
    join auth.users u on u.id = ta.user_id
    left join public.profiles p on p.id = ta.user_id
    where ta.tenant_id = p_tenant
    order by u.email;
end;
$$;
