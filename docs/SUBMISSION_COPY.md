# NimPurchase submission copy

## Project name

NimPurchase

## One-sentence pitch

NimPurchase turns a direct NIM payment into a verified Purchase Passport with receipt details, loyalty progress, and merchant support—without ever taking custody of the buyer’s or merchant’s money.

## Short description

Paying a merchant should not end at the transaction. NimPurchase lets a merchant create a small NIM checkout, then lets the customer pay that merchant directly in Nimiq Pay. The server independently verifies the transaction and waits for Nimiq finality before activating a persistent Purchase Passport.

The Passport is a useful after-sales object: it shows the merchant, item, amount, purchase details, loyalty stamps, and a support action. Merchants can share a checkout, see verified sales, and manage support requests. There are no merchant-specific customer accounts, tokens, custody, refunds, or generic POS features.

## Why Nimiq is essential

NIM is the actual checkout payment asset. The customer approves a direct NIM transfer in Nimiq Pay using `sendBasicTransactionWithData`; the transaction carries only a compact versioned purchase reference. NimPurchase verifies real Nimiq RPC transaction data—network, recipient, amount in Luna, reference, execution result, inclusion, sender, and transaction uniqueness—and activates the Passport only after macro-block finality.

Without Nimiq Pay and Nimiq chain data, there is no payment, no verified purchase, no canonical buyer wallet, and no loyalty credit.

## What users can do

- Merchant: select a Nimiq Pay receiving account, create a NIM checkout, set an optional loyalty rule, and share its link or QR code.
- Customer: approve a direct payment, wait for verification, keep a Purchase Passport, see loyalty progress, and contact the merchant.
- Merchant: view real verified sales and move support requests through Open, In review, and Resolved.

## Trust and safety

- Buyer funds go directly to the merchant wallet snapshot.
- NimPurchase never holds private keys, seed phrases, buyer funds, or merchant funds.
- The app never marks a purchase verified from a hash alone.
- One transaction hash can activate only one purchase.
- Reward credit is idempotent and derived only from active verified purchases.
- Support is an off-chain merchant workflow; it does not reverse NIM transfers.

## Live app

https://nimpurchase.vercel.app

Open in a normal browser for the public product page. Open inside Nimiq Pay for the customer Passport home, merchant workspace, and direct checkout flow. The deployed environment is configured for Nimiq Testnet.

## Demo narration: 45–60 seconds

1. “NimPurchase makes a NIM payment useful after checkout.”
2. Show the merchant workspace and selected Nimiq receiving account.
3. Create a small checkout and show the share link or QR presentation.
4. Open checkout in Nimiq Pay, showing merchant, item, and NIM amount.
5. Approve the payment. “The NIM goes straight to the merchant; NimPurchase never holds it.”
6. Show payment submitted, payment detected, then Purchase verified.
7. Open the Purchase Passport and point out receipt details, loyalty stamps, and support.
8. Show the merchant workspace with the verified sale and resolved support request.
9. Close: “Every verified NIM payment becomes a receipt, a merchant relationship, and progress toward a reward.”

## Evidence to attach

- Merchant checkout creation
- Nimiq Pay payment confirmation
- Verified Purchase Passport
- Loyalty progress across repeat purchases
- Merchant sales list
- Merchant support request marked Resolved

Do not include seed phrases, private keys, database URLs, RPC credentials, or unnecessary full transaction hashes.
