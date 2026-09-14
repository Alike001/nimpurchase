# Prior Art and Reverse Engineering

The goal is not to clone these projects. Extract proven product patterns, remove unnecessary infrastructure, and rebuild the smallest version whose core advantage comes from Nimiq Pay.

## 1. Salespage, ETHGlobal HackFS winner

Project:
- Point-of-sale system for restaurants/retail
- Polygon smart contracts
- every purchase emits an event
- NFT receipt contains merchant/item information and is tied to payer address
- Covalent used for transaction history/reporting

What it proves:
- item-level purchase data + payer address + verified payment is a real product pattern
- "proof of purchase" can be more useful than a raw transfer hash
- merchant history/reporting naturally follows payment verification

What to remove:
- per-store smart contracts
- NFT receipt minting
- IPFS storefront complexity
- Ceramic
- Polygon-specific infrastructure
- full POS scope

What to keep:
- merchant creates a structured order
- payment event activates a purchase record
- buyer can later present the purchase as proof
- merchant can find the exact transaction/order

Nimiq translation:
```text
Salespage contract event
→ Nimiq transaction with compact purchase reference

NFT receipt
→ verified purchase card in Mini App

Covalent query
→ Nimiq JSON-RPC verification
```

## 2. Halo, ETHGlobal Buenos Aires finalist and World Mini App 1st place

Project:
- scan ordinary receipts
- OCR extracts merchant/date/total/category
- verified humans receive rewards
- built as a mini app

What it proves:
- receipts can be the anchor for a repeat-use rewards product
- a receipt product can win when the chain/platform primitive is central
- simple user story is powerful: scan receipt → earn

What to remove:
- OCR
- receipt photographs
- World ID
- Filecoin
- decentralized compute
- reward farming model

What to keep:
- purchase record becomes an object the user returns to
- rewards are downstream of real economic activity
- mobile-first mini-app UX

Nimiq advantage:
We do not need OCR to prove the purchase because the payment happens through Nimiq Pay and carries our purchase reference.

## 3. Cashback ID, HackMoney 2026 ENS prize winner

Project:
- wallet/ENS identity acts as a universal loyalty ID
- purchase activity changes loyalty status
- rewards can settle back as stablecoins

What it proves:
- crypto identity can remove loyalty signup friction
- direct wallet rewards feel more valuable than closed points
- merchant loyalty can be account-light

What to remove:
- ENS
- LI.FI
- Sui dynamic objects
- cross-chain token machinery
- universal multi-merchant identity for MVP

What to keep:
- wallet is enough to identify the returning customer
- reward state derives from verified purchases
- eventual reward can be actual crypto rather than a fake point balance

Nimiq translation:
```text
ENS identity
→ Nimiq buyer address

cross-chain purchase accounting
→ verified NIM purchases

stablecoin cashback
→ optional future NIM merchant reward
```

## 4. Chomp, ETHBogotá Polygon prize

Project:
- restaurant POS/payment flow
- vendor menu to checkout to receipt
- direct crypto-native commerce

What it proves:
- merchant checkout is understandable immediately
- the dangerous scope explosion is real: menus, carts, contracts, POS, receipts

Lesson:
Do not rebuild Chomp.

NimPurchase starts after the merchant has defined a small purchase/order and focuses on verified post-payment value.

## 5. Open Receipt Format / Tommy the Tapir

Project:
- claim-based digital receipts
- structured line items, taxes, totals, payment references, lifecycle
- intentionally payment-agnostic
- not a POS, checkout, loyalty, or identity system

What it proves:
- receipt representation and payment settlement should be separate layers
- structured receipt schemas are more durable than screenshot/PDF-only receipts
- payment references belong in receipt metadata

What to borrow:
- receipt/purchase object with line items
- merchant identity
- totals
- payment reference
- lifecycle state

What not to borrow:
- the entire standard
- complex tax/fiscal scope
- generic adapters

## 6. OLGAX POS and similar open-source POS products

Useful mature patterns:
- catalog
- checkout
- receipt
- purchase history
- returns/refunds
- customer history
- loyalty ledger

What to learn:
- returns/support should always reference a specific sale
- loyalty should be a ledger derived from purchase events, not a mutable number with no audit trail
- receipt/history pages are strong repeat-use surfaces

What to remove:
- inventory
- suppliers
- employee shifts
- tax engines
- cash drawers
- printers
- accounting/reporting breadth

## 7. Stampee

Useful pattern:
- simple digital stamp loyalty for small businesses
- merchant campaign → customer card → stamps → reward

What to borrow:
- a single clear reward rule
- progress display
- small-business mental model

Nimiq improvement:
No separate customer registration is required. Verified wallet purchases can increment progress.

## 8. Existing Nimiq patterns to reuse

### Tanda
Tanda uses:
- `listAccounts()`
- `sign()`
- `isConsensusEstablished()`
- `getBlockNumber()`
- `sendBasicTransactionWithData()`
- `getTransactionsByAddress()`

It rebuilds state from Nimiq transaction history without deploying a smart contract.

Lesson:
A Nimiq Mini App can use native transaction data as an application-level correlation primitive.

### Nimiq Flow
Uses Nimiq JSON-RPC to verify settlement on-chain.

Lesson:
Backend/live-chain verification is already an accepted Nimiq Mini App pattern.

### NimQuest, Cycle I winner
Uses wallet signatures to produce wallet-backed proof.

Lesson:
Use signatures only where they improve the product. Do not add extra approval friction to normal checkout unnecessarily.

## 9. Related hackathon projects that warn us about crowded variants

### Split, ETHGlobal Buenos Aires
Receipt OCR + group split + instant settlement.

Conclusion:
Do not pivot to generic shared expense splitting unless our merchant direction fails.

### Loyo / Loyalz
Loyalty infrastructure has been repeatedly built in Web3.

Conclusion:
"Blockchain loyalty" alone is not original.

### Unwind
Adds crypto refund/escrow infrastructure to POS.

Conclusion:
Do not add escrow in the MVP. It complicates Nimiq integration and custody/reversibility. Our support request can be a workflow record without pretending the app can reverse a NIM transfer.

## Reverse-engineered product synthesis

Proven components from prior art:

```text
structured order           ← POS products
direct wallet payment      ← Nimiq Pay
chain correlation          ← transaction data / payment refs
verified purchase record   ← Salespage / receipt systems
purchase history           ← POS systems
after-sales reference      ← returns/support systems
loyalty progress           ← Stampee / Cashback ID
mini-app repeat loop       ← Halo
```

Our new composition:

```text
Merchant creates a tiny structured purchase
                 ↓
Customer pays merchant directly in NIM
                 ↓
Nimiq transaction carries purchase reference
                 ↓
Backend verifies settlement + macro finality
                 ↓
Interactive purchase card appears
                 ↓
Receipt + support/warranty + loyalty progress
                 ↓
Customer has a reason to return
```

This is the part to build.

Do not present it as:
- an NFT receipt platform
- a generic loyalty protocol
- a POS replacement
- a blockchain explorer
- a refund protocol
- an accounting tool
