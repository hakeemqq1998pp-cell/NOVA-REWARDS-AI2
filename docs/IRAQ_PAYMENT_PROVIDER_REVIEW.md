# Iraq payment-provider review — NOVA REWARDS

Reviewed: 2026-11-08

## Recommendation for the first integration: ZainCash Payment Gateway v2

Official developer documentation: https://docs.zaincash.iq/

Why it is the first candidate:
- IQD is the documented transaction currency.
- Hosted redirect checkout is supported; do not embed it in an iframe.
- The documented flow includes OAuth2, transaction initialization, redirect, JWT verification, inquiry fallback, and webhook status updates.
- The same documentation describes a Cash Disbursement API for batch payouts to ZainCash wallets.
- Production credentials are issued only after contractual/business onboarding.

## Alternatives to request proposals from

- FastPay: https://www.fast-pay.iq/integrate-web — merchant registration and API credentials are issued after contacting its Merchant Acquisition Team; its integration guidance says to validate transactions through its validation API and configure IPN.
- AmanExchange: https://aman.exchange/ — advertises IQD online payments and webhooks. Independently confirm licensing, settlement, payout support, fees, and merchant eligibility before relying on these claims.
- Noqood: https://noqood.bz/ — advertises an Iraqi merchant gateway and local methods. Confirm its current legal entity, license, commercial terms, payout rails, and API documentation directly.
- ePayIraq: https://epayiraq.com/ — advertises collection and payout infrastructure. Request written onboarding and technical specifications.

## Integration safety gates

1. Do not enable real deposits until the merchant account is approved and production credentials are issued.
2. Create checkout sessions only on a trusted server or Supabase Edge Function. Never expose provider client secrets or Supabase service_role in Vite/browser code.
3. Verify provider webhook signatures and independently inquire about transaction status before calling `record_verified_cash_deposit`.
4. Enforce idempotency on provider transaction references; reconcile provider statements against `cash_payment_events` and `cash_ledger`.
5. Do not mark a withdrawal paid until the provider confirms the payout and supplies a unique payout reference.
6. Do not ask users for wallet PINs, passwords, OTPs, or full card credentials.
7. Confirm the provider permits a rewards platform / marketplace model, user-to-user payouts, the intended source of funds, KYC/AML obligations, fees, limits, and settlement timing.

## Current NOVA status

- Cash ledger, payment-event idempotency table, and withdrawal request/finalization RPCs are present in `supabase/cash-wallet.sql`.
- The frontend now displays cash balance/history and can submit a pending withdrawal request using a provider-issued destination token.
- This does not execute a payment or payout. Cash deposits and actual payouts remain unavailable until provider onboarding, a trusted server integration, and required compliance checks are completed.
- The existing points ledger is separate from cash and must not be represented as withdrawable money.
