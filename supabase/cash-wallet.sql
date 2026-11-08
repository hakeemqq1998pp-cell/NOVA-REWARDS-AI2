-- NOVA REWARDS AI2 — cash wallet foundation (migration 003)
-- This is an accounting foundation, NOT a payment gateway.
-- Only a trusted server/webhook using the Supabase service_role may record verified deposits.
-- Never expose service_role credentials in the browser or commit them to Git.

create table if not exists public.cash_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount_minor bigint not null check (amount_minor <> 0),
  currency text not null check (currency in ('IQD','USD')),
  entry_type text not null check (entry_type in ('deposit','withdrawal_hold','withdrawal_refund','adjustment')),
  reference_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null check (char_length(provider) between 2 and 80),
  provider_reference text not null check (char_length(provider_reference) between 3 and 200),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency in ('IQD','USD')),
  created_at timestamptz not null default now(),
  unique(provider, provider_reference)
);

create table if not exists public.cash_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency in ('IQD','USD')),
  destination_token text not null check (char_length(destination_token) between 3 and 200),
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  payout_reference text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cash_ledger_user_currency_created_idx
  on public.cash_ledger(user_id, currency, created_at desc);
create index if not exists cash_withdrawals_user_created_idx
  on public.cash_withdrawals(user_id, created_at desc);
create index if not exists cash_withdrawals_pending_idx
  on public.cash_withdrawals(created_at asc) where status = 'pending';

alter table public.cash_ledger enable row level security;
alter table public.cash_payment_events enable row level security;
alter table public.cash_withdrawals enable row level security;

revoke all on public.cash_ledger, public.cash_payment_events, public.cash_withdrawals from anon, authenticated;
grant select on public.cash_ledger, public.cash_withdrawals to authenticated;

drop policy if exists "members read own cash ledger" on public.cash_ledger;
create policy "members read own cash ledger" on public.cash_ledger
  for select to authenticated using (auth.uid() = user_id or public.is_nova_admin());

drop policy if exists "admins read payment events" on public.cash_payment_events;
create policy "admins read payment events" on public.cash_payment_events
  for select to authenticated using (public.is_nova_admin());

drop policy if exists "members read own cash withdrawals" on public.cash_withdrawals;
create policy "members read own cash withdrawals" on public.cash_withdrawals
  for select to authenticated using (auth.uid() = user_id or public.is_nova_admin());

-- Called only by a trusted payment webhook after verifying the provider signature,
-- payment status, amount, currency, recipient and merchant account.
create or replace function public.record_verified_cash_deposit(
  p_user_id uuid,
  p_provider text,
  p_provider_reference text,
  p_amount_minor bigint,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if p_user_id is null or p_amount_minor is null or p_amount_minor <= 0
     or p_currency not in ('IQD','USD')
     or p_provider is null or char_length(p_provider) not between 2 and 80
     or p_provider_reference is null or char_length(p_provider_reference) not between 3 and 200 then
    raise exception 'Invalid verified payment data';
  end if;

  insert into public.cash_payment_events(user_id, provider, provider_reference, amount_minor, currency)
  values (p_user_id, p_provider, p_provider_reference, p_amount_minor, p_currency)
  returning id into v_event_id;

  insert into public.cash_ledger(user_id, amount_minor, currency, entry_type, reference_id, description)
  values (p_user_id, p_amount_minor, p_currency, 'deposit', v_event_id, 'Verified payment deposit');

  return v_event_id;
exception
  when unique_violation then
    raise exception 'Payment reference already processed';
end;
$$;

revoke all on function public.record_verified_cash_deposit(uuid,text,text,bigint,text) from public, anon, authenticated;
grant execute on function public.record_verified_cash_deposit(uuid,text,text,bigint,text) to service_role;

-- A withdrawal request places an atomic hold. The client supplies only a provider-issued
-- destination token/reference, never a PIN, password, OTP, card number or wallet secret.
create or replace function public.request_cash_withdrawal(
  p_amount_minor bigint,
  p_currency text,
  p_destination_token text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance bigint;
  v_withdrawal_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_amount_minor is null or p_amount_minor <= 0
     or p_currency not in ('IQD','USD')
     or p_destination_token is null or char_length(p_destination_token) not between 3 and 200 then
    raise exception 'Invalid withdrawal request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_currency, 0));

  select coalesce(sum(amount_minor),0) into v_balance
  from public.cash_ledger where user_id = v_user and currency = p_currency;

  if p_amount_minor > v_balance then raise exception 'Insufficient available balance'; end if;

  insert into public.cash_withdrawals(user_id, amount_minor, currency, destination_token)
  values (v_user, p_amount_minor, p_currency, p_destination_token)
  returning id into v_withdrawal_id;

  insert into public.cash_ledger(user_id, amount_minor, currency, entry_type, reference_id, description)
  values (v_user, -p_amount_minor, p_currency, 'withdrawal_hold', v_withdrawal_id, 'Withdrawal requested; funds held');

  return v_withdrawal_id;
end;
$$;

revoke all on function public.request_cash_withdrawal(bigint,text,text) from public, anon;
grant execute on function public.request_cash_withdrawal(bigint,text,text) to authenticated;

-- Admins may mark a withdrawal paid only with an external provider payout reference.
-- Rejected requests atomically refund the held amount.
create or replace function public.admin_finalize_cash_withdrawal(
  p_withdrawal_id uuid,
  p_decision text,
  p_payout_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_user uuid;
  v_amount bigint;
  v_currency text;
  v_status text;
begin
  if v_admin is null or not exists (
    select 1 from public.profiles where id = v_admin and role = 'admin'
  ) then raise exception 'Admin permission required'; end if;

  if p_decision not in ('paid','rejected') then raise exception 'Decision must be paid or rejected'; end if;
  if p_decision = 'paid' and (p_payout_reference is null or char_length(p_payout_reference) not between 3 and 200) then
    raise exception 'A valid provider payout reference is required';
  end if;

  select user_id, amount_minor, currency, status
    into v_user, v_amount, v_currency, v_status
  from public.cash_withdrawals where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Withdrawal not found'; end if;
  if v_status <> 'pending' then raise exception 'Withdrawal has already been finalized'; end if;

  update public.cash_withdrawals
  set status = p_decision, payout_reference = case when p_decision = 'paid' then p_payout_reference else null end,
      reviewed_by = v_admin, reviewed_at = now()
  where id = p_withdrawal_id;

  if p_decision = 'rejected' then
    insert into public.cash_ledger(user_id, amount_minor, currency, entry_type, reference_id, description)
    values (v_user, v_amount, v_currency, 'withdrawal_refund', p_withdrawal_id, 'Rejected withdrawal refunded');
  end if;

  return p_withdrawal_id;
end;
$$;

revoke all on function public.admin_finalize_cash_withdrawal(uuid,text,text) from public, anon;
grant execute on function public.admin_finalize_cash_withdrawal(uuid,text,text) to authenticated;

-- No client can insert or mutate cash ledger/payment rows directly.
