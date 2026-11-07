-- NOVA REWARDS AI2 — initial schema
-- Run this file in Supabase SQL Editor after creating a project.
-- Never put the service_role key in frontend environment variables.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  referral_code text unique,
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points integer not null check (points > 0),
  task_type text not null default 'manual',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  evidence_text text check (evidence_text is null or char_length(evidence_text) <= 2000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, task_id)
);

-- Add review audit fields to existing installations as well.
alter table public.task_completions
  add column if not exists evidence_text text;
alter table public.task_completions
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.task_completions
  add column if not exists reviewed_at timestamptz;

create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.redemption_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points_requested integer not null check (points_requested > 0),
  payout_method text,
  payout_details jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','qualified','rejected')),
  created_at timestamptz not null default now(),
  check (inviter_id <> invitee_id)
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.point_ledger enable row level security;
alter table public.redemption_requests enable row level security;
alter table public.referrals enable row level security;

-- Query indexes for member dashboards and admin review.
create index if not exists point_ledger_user_created_idx
  on public.point_ledger(user_id, created_at desc);
create index if not exists task_completions_pending_created_idx
  on public.task_completions(created_at asc) where status = 'pending';
create index if not exists referrals_inviter_status_idx
  on public.referrals(inviter_id, status);


-- Trusted role check for policies; SECURITY DEFINER avoids recursive profile RLS.
create or replace function public.is_nova_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
 select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_nova_admin() from public;
grant execute on function public.is_nova_admin() to authenticated;

-- Restrict table privileges as well as row-level policies.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.tasks from anon, authenticated;
revoke all on table public.task_completions from anon, authenticated;
revoke all on table public.point_ledger from anon, authenticated;
revoke all on table public.redemption_requests from anon, authenticated;
revoke all on table public.referrals from anon, authenticated;

grant select, insert on table public.profiles to authenticated;
grant select on table public.tasks to authenticated;
grant select on table public.task_completions to authenticated;
grant select on table public.point_ledger to authenticated;
grant select, insert on table public.redemption_requests to authenticated;
grant select on table public.referrals to authenticated;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles
  for select to authenticated using (auth.uid() = id);

-- A member cannot create an admin profile or promote themselves.
drop policy if exists "profiles insert own member" on public.profiles;
create policy "profiles insert own member" on public.profiles
  for insert to authenticated with check (auth.uid() = id and role = 'member');

-- No client-side profile role updates. Add a narrowly scoped display_name
-- update policy later if needed; role changes belong to trusted admin tooling.

drop policy if exists "active tasks visible" on public.tasks;
create policy "active tasks visible" on public.tasks
  for select to authenticated using (is_active = true);

drop policy if exists "admins read all tasks" on public.tasks;
create policy "admins read all tasks" on public.tasks
  for select to authenticated using (public.is_nova_admin());

drop policy if exists "users read own completions" on public.task_completions;
create policy "users read own completions" on public.task_completions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "admins read all completions" on public.task_completions;
create policy "admins read all completions" on public.task_completions
  for select to authenticated using (public.is_nova_admin());

-- Completion requests are inserted only through request_task_completion().
-- This prevents clients from bypassing the active-task check in that RPC.
drop policy if exists "users create own completion requests" on public.task_completions;

drop policy if exists "users read own ledger" on public.point_ledger;
create policy "users read own ledger" on public.point_ledger
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "users read own redemption requests" on public.redemption_requests;
create policy "users read own redemption requests" on public.redemption_requests
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "users request redemption" on public.redemption_requests;
create policy "users request redemption" on public.redemption_requests
  for insert to authenticated with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "users read referrals they are part of" on public.referrals;
create policy "users read referrals they are part of" on public.referrals
  for select to authenticated using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- Important: point awards, approvals, admin actions and payouts must be implemented
-- in trusted server-side functions with strict validation and audit logs.
-- Do not allow clients to directly write approved points or mark payouts as paid.
