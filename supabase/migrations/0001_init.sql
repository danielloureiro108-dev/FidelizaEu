-- ============================================================================
--  Fidelidade White-Label — schema inicial
--  Rode no SQL Editor do seu projeto Supabase (ou via `supabase db push`).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
--  TENANTS (estabelecimentos) — a base do white-label.
--  Cada linha carrega a identidade visual aplicada em runtime.
-- ---------------------------------------------------------------------------
create table if not exists public.tenants (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  logo_url        text,
  -- Cores em formato "R G B" (ex.: "26 35 92"), consumidas como CSS variables.
  color_primary   text not null default '26 35 92',    -- azul-marinho
  color_secondary text not null default '212 160 23',  -- dourado
  color_accent    text not null default '212 160 23',
  color_ink       text not null default '17 24 39',
  font_display    text not null default 'Georgia',
  font_sans       text not null default 'system-ui',
  -- Segredo usado para gerar o QR rotativo (HMAC). NUNCA exposto ao cliente.
  stamp_secret    text not null default encode(gen_random_bytes(24), 'hex'),
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  PROGRAMAS DE FIDELIDADE — a estratégia configurável pelo estabelecimento.
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_programs (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  name                text not null default 'Cartão Fidelidade',
  stamps_required     int  not null default 10,   -- "a cada 10 refeições..."
  reward_description  text not null default 'Uma refeição por conta da casa!',
  scans_per_day_limit int  not null default 1,    -- "escanear um QR Code por dia"
  token_rotation_secs int  not null default 60,   -- de quanto em quanto o QR muda
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);
create index if not exists idx_programs_tenant on public.loyalty_programs(tenant_id);

-- ---------------------------------------------------------------------------
--  PROFILES — 1:1 com auth.users. Guarda papel (cliente/admin) e tenant.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id  uuid references public.tenants(id) on delete set null,
  full_name  text,
  role       text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);
create index if not exists idx_profiles_tenant on public.profiles(tenant_id);

-- ---------------------------------------------------------------------------
--  CARDS — o cartão de um cliente dentro de um programa.
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  customer_id     uuid not null references auth.users(id) on delete cascade,
  program_id      uuid not null references public.loyalty_programs(id) on delete cascade,
  stamps          int  not null default 0,
  completed_count int  not null default 0,   -- quantos cartões já fechou
  created_at      timestamptz not null default now(),
  unique (customer_id, program_id)
);
create index if not exists idx_cards_customer on public.cards(customer_id);
create index if not exists idx_cards_tenant on public.cards(tenant_id);

-- ---------------------------------------------------------------------------
--  STAMPS — histórico de carimbos (auditoria + regra "um por dia").
-- ---------------------------------------------------------------------------
create table if not exists public.stamps (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references public.cards(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists idx_stamps_card on public.stamps(card_id);
create index if not exists idx_stamps_customer_day on public.stamps(customer_id, created_at);

-- ---------------------------------------------------------------------------
--  REWARDS — recompensas conquistadas (ex.: refeição grátis).
-- ---------------------------------------------------------------------------
create table if not exists public.rewards (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  card_id     uuid not null references public.cards(id) on delete cascade,
  description text not null,
  status      text not null default 'pending' check (status in ('pending','redeemed')),
  code        text not null default upper(substr(encode(gen_random_bytes(6),'hex'),1,6)),
  created_at  timestamptz not null default now(),
  redeemed_at timestamptz
);
create index if not exists idx_rewards_customer on public.rewards(customer_id);

-- ===========================================================================
--  TRIGGER: ao criar usuário no Auth, cria profile e cartão no tenant padrão.
--  O tenant padrão é o primeiro cadastrado (ideal em deploy 1 estabelecimento).
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tenant  uuid;
  v_program uuid;
begin
  select id into v_tenant from public.tenants order by created_at asc limit 1;

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
--  FUNÇÃO: register_stamp — carimba de forma atômica e segura.
--  Chamada pelo backend com a service_role (após validar o token do QR).
--  Aplica o limite "N por dia" e, ao completar, gera a recompensa.
-- ===========================================================================
create or replace function public.register_stamp(p_customer uuid, p_tenant uuid)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_program        public.loyalty_programs%rowtype;
  v_card           public.cards%rowtype;
  v_today_count    int;
  v_reward_created boolean := false;
  v_reward_code    text := null;
begin
  select * into v_program from public.loyalty_programs
    where tenant_id = p_tenant and active = true
    order by created_at asc limit 1;
  if not found then
    return json_build_object('ok', false, 'reason', 'no_program');
  end if;

  select * into v_card from public.cards
    where customer_id = p_customer and program_id = v_program.id;
  if not found then
    insert into public.cards (tenant_id, customer_id, program_id)
    values (p_tenant, p_customer, v_program.id)
    returning * into v_card;
  end if;

  -- Regra "um por dia" (fuso America/Sao_Paulo).
  select count(*) into v_today_count
    from public.stamps
    where card_id = v_card.id
      and (created_at at time zone 'America/Sao_Paulo')::date
          = (now() at time zone 'America/Sao_Paulo')::date;

  if v_today_count >= v_program.scans_per_day_limit then
    return json_build_object('ok', false, 'reason', 'daily_limit',
                             'stamps', v_card.stamps,
                             'required', v_program.stamps_required);
  end if;

  insert into public.stamps (card_id, tenant_id, customer_id)
  values (v_card.id, p_tenant, p_customer);

  update public.cards set stamps = stamps + 1
    where id = v_card.id returning * into v_card;

  -- Fechou o cartão? Gera recompensa e reinicia (com carry-over se passar).
  if v_card.stamps >= v_program.stamps_required then
    insert into public.rewards (tenant_id, customer_id, card_id, description)
    values (p_tenant, p_customer, v_card.id, v_program.reward_description)
    returning code into v_reward_code;

    update public.cards
      set stamps = stamps - v_program.stamps_required,
          completed_count = completed_count + 1
      where id = v_card.id returning * into v_card;

    v_reward_created := true;
  end if;

  return json_build_object(
    'ok', true,
    'stamps', v_card.stamps,
    'required', v_program.stamps_required,
    'reward_created', v_reward_created,
    'reward_code', v_reward_code
  );
end;
$$;

-- ===========================================================================
--  ROW LEVEL SECURITY
-- ===========================================================================
alter table public.tenants          enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.profiles         enable row level security;
alter table public.cards            enable row level security;
alter table public.stamps           enable row level security;
alter table public.rewards          enable row level security;

-- Helper: o profile do usuário logado é admin?
create or replace function public.is_admin_of(p_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and tenant_id = p_tenant
  );
$$;

-- TENANTS: qualquer um lê a marca (necessário p/ tema); só admin edita a sua.
drop policy if exists tenants_read on public.tenants;
create policy tenants_read on public.tenants for select using (true);
drop policy if exists tenants_update on public.tenants;
create policy tenants_update on public.tenants for update using (public.is_admin_of(id));

-- PROGRAMS: leitura pública (cliente precisa saber a meta); admin gerencia.
drop policy if exists programs_read on public.loyalty_programs;
create policy programs_read on public.loyalty_programs for select using (true);
drop policy if exists programs_write on public.loyalty_programs;
create policy programs_write on public.loyalty_programs for all
  using (public.is_admin_of(tenant_id)) with check (public.is_admin_of(tenant_id));

-- PROFILES: cada um lê/edita o seu; admin lê os do seu tenant.
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select
  using (id = auth.uid() or public.is_admin_of(tenant_id));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (id = auth.uid());

-- CARDS: cliente vê o seu; admin vê os do tenant. Escrita só via função (service role).
drop policy if exists cards_read on public.cards;
create policy cards_read on public.cards for select
  using (customer_id = auth.uid() or public.is_admin_of(tenant_id));

-- STAMPS: cliente vê os seus; admin vê os do tenant.
drop policy if exists stamps_read on public.stamps;
create policy stamps_read on public.stamps for select
  using (customer_id = auth.uid() or public.is_admin_of(tenant_id));

-- REWARDS: cliente vê as suas; admin vê e marca como resgatada.
drop policy if exists rewards_read on public.rewards;
create policy rewards_read on public.rewards for select
  using (customer_id = auth.uid() or public.is_admin_of(tenant_id));
drop policy if exists rewards_redeem on public.rewards;
create policy rewards_redeem on public.rewards for update
  using (public.is_admin_of(tenant_id)) with check (public.is_admin_of(tenant_id));

-- ===========================================================================
--  SEGURANÇA DE COLUNA: o stamp_secret NUNCA pode chegar ao cliente.
--  RLS é por linha; para esconder a coluna usamos privilégio de coluna.
--  (O backend lê o segredo apenas via service_role, que ignora isso.)
-- ===========================================================================
revoke select (stamp_secret) on public.tenants from anon, authenticated;

-- ===========================================================================
--  SEED — estabelecimento de exemplo (troque pelos seus dados).
-- ===========================================================================
insert into public.tenants (slug, name, color_primary, color_secondary, color_accent, color_ink, font_display)
values ('seu-donario', 'Seu Donário Restaurante', '26 35 92', '212 160 23', '212 160 23', '17 24 39', 'Georgia')
on conflict (slug) do nothing;

insert into public.loyalty_programs (tenant_id, name, stamps_required, reward_description, scans_per_day_limit, token_rotation_secs)
select id, 'Cartão Fidelidade', 10, 'A cada 10 refeições, uma é por conta da casa!', 1, 60
from public.tenants where slug = 'seu-donario'
and not exists (select 1 from public.loyalty_programs lp where lp.tenant_id = tenants.id);
