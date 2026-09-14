# Hackathon Alignment

## Current Cycle II requirements

The project must:
- use the Nimiq Pay Mini Apps Framework
- have a public GitHub repository
- use the MIT license
- follow Mini Apps technical standards
- contain no hardcoded private keys or API secrets
- support NIM, USDT, or both
- make Nimiq wallet/transactions/payment infrastructure part of the core experience
- be fully functional and usable on the first try
- be a real product, not a mockup/prototype

For this product, use NIM first.

## Scoring map

### 45 points: functionality, reliability and usefulness

How NimPurchase should earn these:
- one end-to-end flow works every time
- wallet rejection is handled clearly
- RPC delay does not look like failure
- payment mismatch is caught
- refresh/reopen does not lose the purchase
- target user is immediately obvious
- after-sales record solves a real commerce problem
- purchase history and loyalty give repeat value
- no dead buttons or fake flows

Build priority:
```text
reliability > feature count
```

### 25 points: Nimiq Pay and Nimiq integration

Strong integration:
- Mini App runs inside Nimiq Pay
- Nimiq wallet identifies payer
- NIM payment happens through native Mini App provider
- `sendBasicTransactionWithData` carries purchase reference
- Nimiq RPC verifies payment
- Nimiq macro finality activates purchase
- optional wallet signature can authenticate merchant/customer sessions

The product's core state should not become "paid" from a database button. It becomes paid because Nimiq confirms the payment.

### 15 points: real usage

Plan for real usage before final polish:
- recruit a few real merchants or simulated merchant roles with actual NIM receiving addresses
- use tiny NIM-priced items/services
- record real purchases
- encourage at least some users to make a second purchase
- gather short feedback quotes
- fix observed confusion

Track:
- verified purchases
- unique buyers
- unique merchants
- repeat buyers
- support requests
- reward completions

### 10 points: design and UX

Goals:
- explain product on first screen
- mobile-first
- one obvious CTA
- human language
- hide protocol jargon
- clear payment states
- polished empty/loading/error states
- purchase card should look like something worth keeping

### 5 points: builder promotion

Content angles:
- "What happens after a crypto payment?"
- "We turned a NIM transaction into a useful purchase card."
- "A merchant received NIM directly. Our app never touched the funds."
- "We tested verified digital receipts with real Nimiq payments."
- short progress videos
- real user testing clips/screens
- post technical findings about macro-block finality and transaction-data correlation

## 30-second judge test

A judge should understand this without explanation:

```text
1. Merchant creates a 2 NIM coffee purchase.
2. Buyer pays inside Nimiq Pay.
3. The app verifies the actual transaction.
4. Buyer gets a permanent purchase card with receipt, support and reward progress.
```

If the UI requires a paragraph about blockchain architecture before the value is clear, redesign it.

## Product-not-demo test

Before submission, answer yes to all:

- Can a new merchant create something purchasable?
- Can a real user pay real NIM?
- Does the chain, not a mock, confirm payment?
- Does a purchase persist after refresh?
- Can the customer reopen it later?
- Can a support action be created?
- Does reward progress update from verified purchases?
- Are errors explained?
- Is the repo MIT licensed and public?
- Is the deployed app usable in Nimiq Pay?

## Competitive positioning

Do not pitch:
- "digital receipts on blockchain"
- "blockchain loyalty"
- "crypto POS"

Pitch:

> Nimiq Pay already makes the payment easy. NimPurchase makes the payment useful after checkout.

This is a sharper post-payment position.

Comparison:
```text
NimBooks:
transaction → accounting/proof

NimPurchase:
merchant purchase → NIM payment → verified purchase → support/reward → repeat customer
```

## Scope guard

Any feature request during building must pass:

1. Does it strengthen the hero flow?
2. Does it improve one scoring category materially?
3. Can it be polished before submission?
4. Does it avoid turning the app into a generic POS?

If not, defer it.
