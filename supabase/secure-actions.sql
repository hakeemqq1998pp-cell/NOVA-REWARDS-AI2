-- NOVA REWARDS AI2 — secure member actions (migration 002)
-- Run after schema.sql and profile-bootstrap.sql.
-- All point-changing operations happen in PostgreSQL, never in browser code.

create table if not exists public.daily_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  claim_date date not null,
  points_awarded integer not null default 25 check (points_awarded > 0),
  created_at timestamptz not null default now(),
  unique (user_id, claim_date)
);

alter table public.daily_claims enable row level security;

revoke all on table public.daily_claims from anon, authenticated;
grant select on table public.daily_claims to authenticated;

drop policy if exists "members read own daily claims" on public.daily_claims;
create policy "members read own daily claims"
  on public.daily_claims for select to authenticated
  using (auth.uid() = user_id);

-- Members can request a task review. This never approves the task or awards points.
create or replace function public.request_task_completion(p_task_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_completion uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.tasks
    where id = p_task_id and is_active = true
  ) then
    raise exception 'Task is not available';
  end if;

  insert into public.task_completions(user_id, task_id, status, points_awarded)
  values (v_user, p_task_id, 'pending', 0)
  returning id into v_completion;

  return v_completion;
exception
  when unique_violation then
    raise exception 'A completion request already exists for this task';
end;
$$;

revoke all on function public.request_task_completion(uuid) from public;
grant execute on function public.request_task_completion(uuid) to authenticated;

-- One daily reward per Baghdad calendar day. This writes the ledger atomically.
create or replace function public.claim_daily_reward()
returns table(points_awarded integer, claim_date date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Baghdad')::date;
  v_points integer := 25;
  v_claim_id uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  insert into public.daily_claims(user_id, claim_date, points_awarded)
  values (v_user, v_day, v_points)
  returning id into v_claim_id;

  insert into public.point_ledger(user_id, amount, reason, reference_id)
  values (v_user, v_points, 'daily_reward', v_claim_id);

  return query select v_points, v_day;
exception
  when unique_violation then
    raise exception 'Daily reward already claimed';
end;
$$;

revoke all on function public.claim_daily_reward() from public;
grant execute on function public.claim_daily_reward() to authenticated;

-- Only a database-authorized admin may approve/reject a pending task.
-- Approval and ledger credit happen in one transaction.
create or replace function public.admin_review_task_completion(
  p_completion_id uuid,
  p_decision text
)
returns table(completion_id uuid, new_status text, points_awarded integer)
language plpgsql
security definer
set search_path = public
as $
declare
  v_admin uuid := auth.uid();
  v_user_id uuid;
  v_task_id uuid;
  v_current_status text;
  v_task_points integer;
  v_awarded integer := 0;
begin
  if v_admin is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_admin and role = 'admin'
  ) then
    raise exception 'Admin permission required';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select tc.user_id, tc.task_id, tc.status, t.points
    into v_user_id, v_task_id, v_current_status, v_task_points
  from public.task_completions tc
  join public.tasks t on t.id = tc.task_id
  where tc.id = p_completion_id
  for update of tc;

  if not found then
    raise exception 'Task completion request not found';
  end if;

  if v_current_status <> 'pending' then
    raise exception 'Task completion has already been reviewed';
  end if;

  if p_decision = 'approved' then
    v_awarded := v_task_points;
    update public.task_completions
      set status = 'approved', points_awarded = v_awarded
      where id = p_completion_id;

    insert into public.point_ledger(user_id, amount, reason, reference_id)
      values (v_user_id, v_awarded, 'task_completion', p_completion_id);
  else
    update public.task_completions
      set status = 'rejected', points_awarded = 0
      where id = p_completion_id;
  end if;

  return query select p_completion_id, p_decision, v_awarded;
end;
$;

revoke all on function public.admin_review_task_completion(uuid, text) from public;
grant execute on function public.admin_review_task_completion(uuid, text) to authenticated;

-- Members may not directly insert ledger entries or change task approval status.
-- Trusted service-side admin tooling must handle approvals and awards.
