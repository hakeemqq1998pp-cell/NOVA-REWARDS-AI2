-- NOVA REWARDS AI2 — profile bootstrap migration
-- Run after supabase/schema.sql in the Supabase SQL Editor.
-- This creates a member profile for every newly registered Auth user.
-- It never grants admin privileges and never awards points.

create or replace function public.handle_new_nova_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $
declare
  v_referral_code text;
  v_inviter_id uuid;
begin
  insert into public.profiles (id, display_name, referral_code, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'NOVA Member'
    ),
    upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12)),
    'member'
  )
  on conflict (id) do nothing;

  -- Record a referral supplied during email-link signup; rewards remain pending
  -- until a separate trusted qualification process approves them.
  v_referral_code := upper(nullif(btrim(new.raw_user_meta_data ->> 'referral_code'), ''));
  if v_referral_code is not null then
    select id into v_inviter_id
    from public.profiles
    where referral_code = v_referral_code and id <> new.id
    limit 1;

    if v_inviter_id is not null then
      insert into public.referrals (inviter_id, invitee_id, status)
      values (v_inviter_id, new.id, 'pending')
      on conflict (invitee_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_nova_profile on auth.users;
create trigger on_auth_user_created_nova_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_nova_profile();

-- Backfill profiles for accounts that existed before this trigger was installed.
-- Existing role values are preserved; only missing profile rows are created.
insert into public.profiles (id, display_name, referral_code, role)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'NOVA Member'
  ),
  upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12)),
  'member'
from auth.users u
on conflict (id) do nothing;

-- Starter tasks are intentionally inactive until each task has a verified
-- completion method and an anti-abuse review. No points are granted here.
insert into public.tasks (title, description, points, task_type, is_active)
select v.title, v.description, v.points, 'manual', false
from (values
  ('Complete your profile', 'Add the required profile details.', 120),
  ('Explore NOVA AI', 'Explore the available AI tools.', 80),
  ('Invite a friend', 'Invite a new eligible member.', 150)
) as v(title, description, points)
where not exists (
  select 1 from public.tasks t where t.title = v.title
);
