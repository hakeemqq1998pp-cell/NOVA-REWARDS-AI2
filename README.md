# NOVA REWARDS AI2

Mobile-first rewards platform starter built with React, Vite and Supabase.

## Included in v1
- Arabic RTL and English LTR interface
- Responsive member dashboard
- Task catalogue preview and demo progress
- Points wallet and activity preview
- Referral link preview
- Email magic-link authentication when Supabase is configured
- Initial Supabase schema with Row Level Security policies

## Run locally
```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` to enable Supabase email authentication.

## Supabase setup
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Run `supabase/profile-bootstrap.sql` to create a safe member profile automatically after signup.
4. Add the project URL and anon/public key to the deployment environment.
5. Configure email authentication and redirect URLs.

The profile bootstrap migration does not grant admin privileges or award points. Starter tasks are inserted as inactive until verified completion checks are implemented. The daily reward RPC records its award in the database ledger and enforces one claim per Baghdad day. Task completion requests remain pending and do not award points automatically.

## Deploy to Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Netlify environment variables.
- Redeploy after setting environment variables.

## Production requirements
This repository is an initial starter build, not a live cash-rewards service. Demo points are not money and cannot be withdrawn. Real ads, offerwalls, AI billing, referral qualification, point approvals, redemption and payouts require approved providers, server-side integrations, fraud controls, legal review and operational funding. Never expose Supabase service-role credentials in the browser.

## Structure
- `src/App.jsx` — screens and demo interactions
- `src/styles.css` — responsive visual system
- `src/lib/supabase.js` — optional Supabase client
- `supabase/schema.sql` — initial database schema
- `supabase/profile-bootstrap.sql` — automatic member-profile creation
