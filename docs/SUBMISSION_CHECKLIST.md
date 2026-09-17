# NimPurchase submission checklist

## Before deployment

- [ ] Public repository is MIT licensed and contains no `.env`, private keys, RPC credentials, or database passwords.
- [ ] `npm ci`, `npm run test`, `npm run lint`, and `npm run build` pass.
- [ ] PostgreSQL migrations are applied through `npm run db:migrate`.
- [ ] `GET /api/health` reports `status: ok` with the intended Nimiq network.
- [ ] `PUBLIC_APP_URL` is the exact public HTTPS URL opened by Nimiq Pay.
- [ ] The app and API are deployed same-origin or same-site so authenticated merchant cookies work.

## Real Nimiq Pay proof

- [ ] Merchant opens `/merchant` inside Nimiq Pay and signs in with the receiving account.
- [ ] Merchant creates a small NIM checkout and shares it using the QR code or link.
- [ ] Buyer opens the checkout in Nimiq Pay and approves the direct payment.
- [ ] The UI shows payment sent, then payment detected, then Purchase verified after macro-block finality.
- [ ] The receiving account is the merchant account selected during onboarding.
- [ ] The Purchase Passport reopens after refresh and appears in customer history.
- [ ] A second verified purchase updates loyalty progress.
- [ ] A support message requires buyer wallet confirmation and appears in the merchant workspace.
- [ ] Wallet cancellation, expired checkout, temporary RPC delay, and refresh during verification remain understandable and recoverable.

## Submission materials

- [ ] One-sentence pitch: “NimPurchase turns a direct NIM payment into a verified digital purchase card with receipt details, after-sales support, and loyalty progress, without taking custody of the buyer's or merchant's money.”
- [ ] 30–60 second demo follows [the demo script](DEMO_SCRIPT.md).
- [ ] Include screenshots of checkout, payment states, Purchase Passport, merchant sale, QR flow, and support workflow.
- [ ] State clearly that the buyer pays the merchant directly and that NimPurchase never custody funds.
- [ ] Publish only real usage numbers and real transaction demonstrations.
