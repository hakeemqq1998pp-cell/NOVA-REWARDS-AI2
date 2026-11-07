# NOVA REWARDS AI2

Mobile-first rewards platform starter built with React, Vite and Supabase.

## Included in v1
- Arabic RTL and English LTR interface
- Responsive member dashboard
- Live active-task catalogue for signed-in members, with a local-only demo preview for visitors
- Database-backed points balance and recent ledger activity for signed-in members
- Personal referral codes with signup attribution; referrals are recorded as pending and never auto-award points
- Email magic-link authentication when Supabase is configured
- Supabase schema with Row Level Security
- Database-backed daily reward (25 demo points, one claim per Baghdad calendar day)
- Secure task-review request RPC; requests remain pending and do not award points

## Run locally
```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` to enable Supabase email authentication. Use only the Supabase anon/public key in frontend settings. Never expose the service-role key.

## Supabase setup
Run these scripts in the Supabase SQL Editor in this exact order:

1. `supabase/schema.sql`
2. `supabase/profile-bootstrap.sql`
3. `supabase/secure-actions.sql`

Then configure Supabase Authentication:
- Enable email magic-link authentication.
- Add the deployed site URL and local development URL to the allowed redirect URLs.
- Confirm the email provider is configured and test signup/sign-in.

The profile trigger creates member profiles only; it never grants admin privileges or awards points.
To grant the first administrator, create/sign in to the intended account, then run a one-time owner-controlled SQL statement in the Supabase SQL Editor (replace the email):
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
```
The admin screen can then review pending task requests. Approval and point-ledger credit are performed atomically by `admin_review_task_completion()`; members cannot call it successfully.
 It also backfills profiles for existing Auth users. Signup links may carry a referral code; valid attribution is recorded as a pending referral, with no automatic reward. Starter tasks are inserted as inactive until each task has a real completion verifier and anti-abuse review. The daily reward RPC records its award atomically in the database ledger and enforces one claim per Baghdad day. Task completion requests remain pending and do not award points automatically. Direct client inserts into task completions are disabled; requests must use the validation RPC.

## Deploy to Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Netlify environment variables.
- Add the Netlify site URL to Supabase Auth redirect URLs.
- Redeploy after setting environment variables.

A GitHub Actions build check runs on pushes to `main` and `nova-v1-build`, and on pull requests targeting `main`.

## Payments, ads and real rewards
This repository is a starter application, not a live cash-rewards service. Points shown in demo mode are not money and cannot be withdrawn. No payment processor, bank/mobile-wallet payout, ad network, offerwall or paid AI provider is currently connected.

A real payment or payout integration cannot safely be enabled without:
- a verified merchant/business account and provider approval,
- API credentials and webhook secrets supplied by the account owner,
- a server-side integration (never browser-exposed secrets),
- payout rules, identity/anti-fraud controls, reconciliation and legal review,
- a funded settlement balance.

Until those prerequisites exist, redemption remains disabled. Do not collect card details, wallet PINs, OTPs or passwords in this app. Do not advertise demo points as cash value.

## Security notes
- RLS is enabled on member, task, ledger, redemption and referral tables.
- Members cannot grant themselves admin privileges.
- Clients cannot write point-ledger entries or approve tasks.
- Daily claims are limited by a unique user/date constraint and a transactional RPC.
- Task completion requests are validated against active tasks in a security-definer RPC.
- Admin task approvals are role-checked and award points atomically with the status update.
- Referral attribution is recorded at signup only; qualification and rewards still require trusted server-side workflows and audit logs.
- Real admin approval, redemptions and payouts still require trusted server-side workflows and audit logs.

## Structure
- `src/App.jsx` — screens and demo interactions
- `src/styles.css` — responsive visual system
- `src/lib/supabase.js` — optional Supabase client
- `supabase/schema.sql` — initial schema and RLS
- `supabase/profile-bootstrap.sql` — member profile creation
- `supabase/secure-actions.sql` — database-backed member actions
