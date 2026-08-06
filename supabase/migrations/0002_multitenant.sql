-- ============================================================================
--  Multi-tenant — resolução por domínio + provisionamento de estabelecimentos.
--  Rode DEPOIS de 0001_init.sql.
-- ============================================================================

-- Domínio próprio do estabelecimento (ex.: fidelidade.donario.com.br).
-- A resolução por subdomínio (donario.SEU-ROOT) usa a coluna slug já existente.
alter table public.tenants
  add column if not exists custom_domain text unique;

-- Dono da plataforma (revendedor): pode criar tenants e nomear admins.
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

-- ---------------------------------------------------------------------------
--  Helper: o usuário logado é super admin da plataforma?
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_super_admin = true
  );
$$;

-- ===========================================================================
--  Novo handle_new_user: vincula ao tenant vindo do metadata (se houver).
--  Em multi-tenant, o tenant "casa" vem do domínio onde a pessoa se cadastrou;
--  o app envia tenant_id no metadata no signup por e-mail. Para OAuth (Google),
--  o vínculo é feito depois por attach_customer, na primeira visita ao cartão.
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tenant  uuid;
  v_program uuid;
begin
  v_tenant := nullif(new.raw_user_meta_data->>'tenant_id', '')::uuid;

  insert into public.profiles (id, tenant_id, full_name, role)
  values (
    new.id,
    v_tenant,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'customer'
  );

  if v_tenant is not null then
    select id into v_program from public.loyalty_programs
      where tenant_id = v_tenant and active = true
      order by created_at asc limit 1;
    if v_program is not null then
      insert into public.cards (tenant_id, customer_id, program_id)
      values (v_tenant, new.id, v_program)
      on conflict (customer_id, program_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- ===========================================================================
--  attach_customer — garante que o usuário tenha um cartão NESTE tenant.
--  Chamado ao abrir o cartão. Um mesmo usuário pode ter cartões em vários
--  estabelecimentos (um cartão por programa). Só define o tenant "casa" se
--  ainda estiver vazio — nunca sobrescreve.
-- ===========================================================================
create or replace function public.attach_customer(p_tenant uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_program uuid;
begin
  if auth.uid() is null then return; end if;

  update public.profiles set tenant_id = p_tenant
    where id = auth.uid() and tenant_id is null;

  select id into v_program from public.loyalty_programs
    where tenant_id = p_tenant and active = true
    order by created_at asc limit 1;

  if v_program is not null then
    insert into public.cards (tenant_id, customer_id, program_id)
    values (p_tenant, auth.uid(), v_program)
    on conflict (customer_id, program_id) do nothing;
  end if;
end;
$$;

-- ===========================================================================
--  create_tenant — provisiona um novo estabelecimento + programa padrão.
--  Restrito ao super admin.
-- ===========================================================================
create or replace function public.create_tenant(
  p_name            text,
  p_slug            text,
  p_custom_domain   text default null,
  p_color_primary   text default '26 35 92',
  p_color_secondary text default '212 160 23',
  p_stamps_required int  default 10,
  p_reward          text default 'Uma refeição por conta da casa!'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: apenas super admin';
  end if;

  insert into public.tenants
    (slug, name, custom_domain, color_primary, color_secondary, color_accent)
  values
    (lower(p_slug), p_name, nullif(p_custom_domain, ''),
     p_color_primary, p_color_secondary, p_color_secondary)
  returning id into v_id;

  insert into public.loyalty_programs
    (tenant_id, name, stamps_required, reward_description)
  values
    (v_id, 'Cartão Fidelidade', p_stamps_required, p_reward);

  return v_id;
end;
$$;

-- ===========================================================================
--  grant_admin — nomeia um usuário (por e-mail) como admin de um tenant.
--  Restrito ao super admin. A pessoa precisa já ter feito login uma vez.
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

  update public.profiles
    set role = 'admin', tenant_id = p_tenant
    where id = v_uid;
  return true;
end;
$$;

-- ===========================================================================
--  RLS para super admin (gerenciar tenants e profiles da plataforma).
-- ===========================================================================
drop policy if exists tenants_super_all on public.tenants;
create policy tenants_super_all on public.tenants for all
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists profiles_super on public.profiles;
create policy profiles_super on public.profiles for all
  using (public.is_super_admin()) with check (public.is_super_admin());
