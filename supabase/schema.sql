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
  created_at timestamptz not null default now(),
  unique(user_id, task_id)
);

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

create policy "profiles read own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "active tasks visible" on public.tasks for select to authenticated using (is_active = true);
create policy "users read own completions" on public.task_completions for select to authenticated using (auth.uid() = user_id);
create policy "users create own completion requests" on public.task_completions for insert to authenticated with check (auth.uid() = user_id and status = 'pending' and points_awarded = 0);
create policy "users read own ledger" on public.point_ledger for select to authenticated using (auth.uid() = user_id);
create policy "users read own redemption requests" on public.redemption_requests for select to authenticated using (auth.uid() = user_id);
create policy "users request redemption" on public.redemption_requests for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
create policy "users read referrals they are part of" on public.referrals for select to authenticated using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- Important: point awards, approvals, admin actions and payouts must be implemented
-- in trusted server-side functions with strict validation and audit logs.
-- Do not allow clients to directly write approved points or mark payouts as paid.
