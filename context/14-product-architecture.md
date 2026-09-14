# Product Architecture

## Recommended stack

Keep the stack familiar and boring.

Frontend:
- React + TypeScript + Vite
- Nimiq Mini App SDK
- mobile-first UI
- TanStack Query optional for async server state
- React Router only if needed

Backend:
- TypeScript
- small HTTP API
- Node-compatible runtime
- PostgreSQL/Supabase or another simple relational store

Blockchain:
- Nimiq Pay Mini App SDK for buyer wallet actions
- Nimiq JSON-RPC for backend verification

Do not introduce a smart contract unless later evidence proves it is necessary. The current product does not need one.

## High-level components

```text
┌─────────────────────────────┐
│ Nimiq Pay Mini App          │
│ React / TypeScript          │
│                             │
│ checkout                    │
│ purchase history            │
│ purchase detail             │
│ reward progress             │
│ support request             │
└──────────────┬──────────────┘
               │
               │ HTTPS
               ▼
┌─────────────────────────────┐
│ Application API             │
│                             │
│ purchase service            │
│ merchant service            │
│ payment verifier            │
│ reward ledger               │
│ support workflow            │
└───────┬─────────────┬───────┘
        │             │
        │             │ JSON-RPC
        ▼             ▼
   PostgreSQL     Nimiq network
```

## Core database tables

### merchants

```text
id
display_name
wallet_address
slug
created_at
```

### products

```text
id
merchant_id
name
description
price_luna
active
created_at
```

For fastest MVP, products may be optional and purchases can contain merchant-entered line items directly.

### purchases

```text
id
chain_reference UNIQUE
merchant_id
merchant_wallet_snapshot
buyer_wallet NULL until verified
expected_amount_luna
currency
status
tx_hash UNIQUE NULL until submitted
tx_block_height
tx_timestamp
payment_detected_at
finalized_at
created_at
expires_at
```

### purchase_items

```text
id
purchase_id
name
quantity
unit_price_luna
line_total_luna
```

### reward_programs

```text
id
merchant_id
type
threshold
reward_description
active
```

MVP type:
```text
VISIT_COUNT
```

### reward_events

Append-only where possible:

```text
id
merchant_id
buyer_wallet
purchase_id
delta
reason
created_at
```

Reward progress is derived from verified purchase events.

### support_requests

```text
id
purchase_id
buyer_wallet
status
message
created_at
updated_at
```

## Purchase state machine

```text
DRAFT
  ↓
PAYMENT_PENDING
  ↓
PAYMENT_SUBMITTED
  ↓
PAYMENT_DETECTED
  ↓
VERIFIED
  ↓
ACTIVE
```

Failure/terminal branches:

```text
EXPIRED
PAYMENT_MISMATCH
PAYMENT_FAILED
CANCELLED
```

Support is a separate state machine. Do not overload purchase status.

## Payment verification service

Public application service interface:

```ts
verifyPurchasePayment(purchaseId: string, txHash: string): Promise<VerificationResult>
```

Internal steps:

```text
load purchase
↓
enforce not already completed by different tx
↓
fetch tx by hash
↓
if missing: submitted/not-yet-visible
↓
normalize RPC representation
↓
validate hash
↓
validate network
↓
validate recipient
↓
validate value
↓
decode and validate chain reference
↓
validate transaction validity
↓
require executionResult !== false
↓
capture canonical buyer from sender
↓
persist PAYMENT_DETECTED
↓
check macro finality
↓
persist VERIFIED
↓
append reward event exactly once
```

Use a database transaction around final activation/reward append.

## Idempotency

The same verification request may run many times.

Required behavior:

```text
same purchase + same valid tx
→ same successful result

same tx used for different purchase
→ reject

same purchase submitted with conflicting tx
→ reject or require explicit recovery path
```

Unique indexes:
- `purchases.chain_reference`
- `purchases.tx_hash`
- reward event unique on `(purchase_id, reason)` for purchase-credit events

## Nimiq adapter

Create one module such as:

```text
src/server/nimiq/
  rpc-client.ts
  normalize-transaction.ts
  verify-payment.ts
  finality.ts
  decode-data.ts
  types.ts
```

No UI or business service should care whether RPC calls return `data` or `recipientData`.

Internal normalized type:

```ts
type NormalizedNimiqTransaction = {
  hash: string
  sender: string
  recipient: string
  valueLuna: bigint | number
  dataText?: string
  network: string
  valid?: boolean
  executionResult?: boolean
  state?: string
  blockHeight?: number
  confirmations?: number
  timestamp?: number
}
```

## Compact on-chain reference

Format:

```text
np:v1:<id>
```

Constraints:
- UTF-8 text
- well below 64 bytes
- versioned
- no PII
- no product name
- no customer name
- no full receipt
- no secret

Decoder should reject:
- wrong prefix
- unsupported version
- malformed identifier

## Customer identity

Do not create an email/password requirement for customers.

Customer purchase history can be keyed primarily by Nimiq wallet address.

If an application session is needed, use a wallet-signature challenge later. Do not force an extra signature during the payment flow unless required.

## Merchant authentication

For a hackathon MVP:
- merchant may authenticate through wallet signature challenge
- merchant wallet becomes the merchant identity
- server issues normal secure session after signature verification

This makes the Nimiq integration deeper without adding custody.

If signature verification becomes a schedule risk, use a simple authenticated merchant admin while ensuring merchant payout address ownership is explicitly demonstrated before production. Prefer the wallet-signature route if current SDK support is straightforward.

## UX screens

Keep screens few:

Customer:
1. checkout
2. payment progress
3. purchase card
4. purchase history

Merchant:
1. merchant home
2. create purchase/product
3. sales list
4. support list

Avoid a huge admin dashboard.

## Purchase card

Above the fold:

```text
Merchant name
Item / order summary
Amount
✓ Verified with Nimiq
Purchase date
Reward progress
```

Secondary:
- transaction details
- support action
- warranty/return note

Do not dump hashes and protocol jargon in the main UI.

## Test plan

Unit tests:
- chain reference codec
- transaction normalization
- correct payment predicate
- wrong amount
- wrong merchant
- wrong reference
- execution failure
- idempotency
- reward credited once
- finality rule

Integration tests:
- mocked RPC responses
- purchase lifecycle
- retry while tx missing
- RPC outage recovery
- finalization transition

Manual Nimiq Pay tests:
- user rejects wallet confirmation
- successful payment
- slow inclusion
- refresh during confirmation
- reopen purchase history
- duplicate verification call

## Deployment

Frontend and API may be deployed together or separately.

Required environment configuration:
- database URL
- Nimiq RPC endpoint
- network identifier
- public app URL
- session secret if server sessions are used

No secret belongs in the Git repository.
