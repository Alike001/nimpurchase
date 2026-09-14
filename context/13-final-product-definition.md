# Final Product Definition

## Working name

NimPurchase

The final public name may change. Do not delay implementation for naming.

## One sentence

NimPurchase turns a direct NIM payment into a verified digital purchase card with receipt details, after-sales support, and loyalty progress.

## 30-second explanation

A customer buys something from a merchant and pays directly with Nimiq Pay. The payment carries a small purchase reference. NimPurchase verifies the real Nimiq transaction and creates a purchase card showing what was bought, proof of payment, any warranty or support information, and reward progress. The app never holds the customer's or merchant's money.

## The real problem

A blockchain transfer proves:

```text
wallet A sent X NIM to wallet B
```

It does not naturally answer:

```text
What did I buy?
Which merchant/order was this?
Do I still have warranty?
Can I contact the merchant about this exact purchase?
Does this purchase count toward a repeat-customer reward?
```

Paper/email receipts and independent loyalty systems fragment those answers.

NimPurchase uses the payment as the trusted anchor and keeps the commerce context around it.

## Target user

Primary:
- small merchants already willing to accept NIM
- cafés, sellers, event vendors, creators selling physical/digital items, small service businesses

Secondary:
- Nimiq Pay users who want useful purchase history and rewards without creating another merchant account

Do not target enterprises in the MVP.

## Hero user story

```text
Merchant adds "Coffee - 2 NIM"
↓
Customer taps Pay in Nimiq Pay
↓
Customer approves 2 NIM directly to merchant
↓
App says Payment detected
↓
Within Nimiq finality window app says Purchase verified
↓
Customer sees:
  Coffee
  merchant
  2 NIM
  verified payment
  purchase date
  reward progress 3/5
  Get support
```

If judges understand that flow, the product is understandable.

## MVP promises

### Merchant
- create merchant profile
- set receiving Nimiq address
- create a simple product/purchase
- define price
- optionally define one simple reward rule
- generate/open checkout
- see verified purchases
- see support requests

### Customer
- open checkout inside Nimiq Pay
- pay merchant directly in NIM
- watch transaction state
- receive verified purchase card
- see purchase history
- see reward progress
- open a support request tied to the purchase

## Reward model

Keep it deliberately simple:

Example:

```text
Buy 5 times from this merchant
→ unlock reward
```

For the MVP, reward may be a merchant-defined entitlement such as:
- free item
- discount next time
- reward badge/status

If adding an actual NIM reward, do it only after core purchase verification is stable.

Do not build:
- complex points conversion
- tradable loyalty tokens
- NFT loyalty cards
- tiers
- cross-merchant rewards
- cross-chain reward routing

## Warranty/support model

Do not claim on-chain refund functionality.

A purchase card may contain:
- support eligibility
- merchant contact/action
- return/warranty note
- support request status

Example:

```text
Support request:
OPEN → IN_REVIEW → RESOLVED
```

This is a commerce workflow linked to a verified purchase.

## What makes Nimiq essential

Remove Nimiq and the strongest part of the product disappears:

```text
wallet identity
+
direct payment
+
purchase reference inside payment
+
on-chain settlement verification
+
fast macro-block finality
```

This is stronger than a normal app that happens to offer crypto checkout.

## What makes it non-custodial

Buyer pays the merchant address directly.

NimPurchase:
- does not receive funds
- does not hold balances
- does not keep private keys
- does not promise reversibility of an irreversible payment

## What makes it a product, not a demo

A real user can:
1. create a merchant
2. create a purchase
3. complete a real NIM payment
4. wait for real Nimiq verification
5. see a persistent purchase
6. return later
7. use support/reward state

No mocked blockchain path is used for the judged core flow.

Browser development mode may exist, but it must be visibly labeled and cannot be the submission's proof of functionality.

## Explicit non-goals

Not in MVP:
- inventory management
- supplier management
- cash/card POS
- tax engine
- refunds/escrow
- HTLC
- USDT
- EVM
- full accounting
- invoice system
- NFT receipts
- receipt OCR
- AI
- merchant chat
- multi-location franchises
- cross-merchant loyalty
- marketplace discovery
- product delivery logistics

Every new feature must justify why it improves one of:
- core reliability
- Nimiq integration
- real usage
- repeat value
- UX

## Success metrics for hackathon

Track real numbers:
- unique merchants
- unique buyer wallets
- verified purchases
- repeat purchases
- support requests opened
- reward completions
- verification failures caught correctly

Strong demo story:

```text
3 merchants
20 buyers
40 verified purchases
8 repeat purchases
2 support requests
4 rewards completed
```

Actual numbers matter more than inflated feature count.
