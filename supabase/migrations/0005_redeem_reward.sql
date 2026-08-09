-- ============================================================================
--  Resgate de recompensas pelo admin — o caixa digita o código que o
--  cliente mostra na tela dele e dá baixa de forma atômica.
--  Rode DEPOIS de 0004_billing.sql.
-- ============================================================================

create or replace function public.redeem_reward(p_tenant uuid, p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_reward public.rewards%rowtype;
begin
  if not public.is_admin_of(p_tenant) then
    raise exception 'forbidden: apenas admin deste estabelecimento';
  end if;

  select * into v_reward from public.rewards
    where tenant_id = p_tenant and upper(code) = upper(trim(p_code))
    order by created_at asc
    limit 1;

  if not found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_reward.status = 'redeemed' then
    return json_build_object('ok', false, 'reason', 'already_redeemed');
  end if;

  update public.rewards
    set status = 'redeemed', redeemed_at = now()
    where id = v_reward.id;

  return json_build_object('ok', true, 'id', v_reward.id, 'description', v_reward.description);
end;
$$;
