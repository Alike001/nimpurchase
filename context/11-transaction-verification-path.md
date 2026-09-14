# Transaction Verification Path

## Conclusion

Yes. A backend can reliably bind a merchant-created purchase record to a real Nimiq transaction and the actual buyer wallet without taking custody of either side's funds.

The clean path is:

```text
merchant creates purchase
        ↓
server creates compact purchase reference
        ↓
customer opens checkout in Nimiq Pay Mini App
        ↓
customer approves direct NIM payment
        ↓
sendBasicTransactionWithData()
        ↓
Nimiq Pay returns transaction hash
        ↓
backend polls/query RPC
        ↓
backend validates chain fields
        ↓
PAYMENT_DETECTED
        ↓
next macro block finalizes batch
        ↓
VERIFIED / ACTIVE PURCHASE
```

## Nimiq Mini App primitive

Use `sendBasicTransactionWithData()` for the NIM MVP.

It accepts:
- recipient
- value in Luna
- optional fee
- text data
- optional validityStartHeight

It returns a transaction hash.

The data field is limited to 64 bytes for a basic-address recipient. Do not serialize the receipt into the transaction. Store a compact opaque purchase reference, for example:

```text
np:v1:01JABCDEFGHJKMNPQRSTVWXYZ
```

A 26-character ULID plus a short namespace/version fits comfortably.

## Purchase creation

Before payment the backend creates:

```ts
Purchase {
  id
  merchantId
  merchantWallet
  expectedAmountLuna
  currency: "NIM"
  items[]
  returnPolicy
  warrantyPolicy
  rewardRuleSnapshot
  status: "PAYMENT_PENDING"
  createdAt
  expiresAt
}
```

Generate a unique `chainReference` derived from or mapped to `purchase.id`.

Important:
- do not trust an amount supplied by the frontend after purchase creation
- do not trust a merchant wallet supplied by the buyer
- snapshot the expected amount and merchant wallet server-side
- enforce one successful transaction per purchase reference
- make verification idempotent

## After Nimiq Pay returns the hash

The client sends only something like:

```json
{
  "purchaseId": "...",
  "txHash": "..."
}
```

The server does not mark the purchase paid merely because it received a hash.

## RPC verification

Use Nimiq JSON-RPC from the backend, preferably through a small adapter module.

Primary query:
- `getTransactionByHash(txHash)`

Relevant transaction fields available in Nimiq's transaction representation include:
- transaction hash
- sender
- recipient
- value
- transaction data / recipient data
- network
- validity start height
- validity
- state
- block height when included
- confirmations
- timestamp
- execution result

Important naming detail:
- the Web Client plain transaction shape exposes the recipient payload as `data`
- the PoS JSON-RPC migration docs refer to the corresponding field as `recipientData`
- implementation should normalize both representations behind one internal adapter instead of spreading provider-specific names through product code

## Verification predicate

A purchase may reach `PAYMENT_DETECTED` only if all required checks pass:

```ts
tx.transactionHash === submittedTxHash
tx.recipient === purchase.merchantWallet
tx.value === purchase.expectedAmountLuna
decodePurchaseRef(tx.data || tx.recipientData) === purchase.chainReference
tx.network === expectedNetwork
tx.valid === true                    // when this field is available
tx.executionResult !== false         // do not rely on state alone
tx.blockHeight != null               // actually included
```

For the buyer identity:

```text
canonical buyer wallet = verified on-chain tx.sender
```

This is stronger than trusting a frontend account variable.

If the UI requested accounts before payment, it may compare the expected address with `tx.sender`, but the chain sender should be the authoritative buyer address for the purchase record.

## Why `executionResult` matters

There is a current Nimiq core issue discussing the meaning of a transaction reported as confirmed while `executionResult` is false.

Therefore:

```text
DO NOT:
state == confirmed → automatically trust everything

DO:
validate recipient + value + data + sender + validity + execution result + finality
```

For a straightforward NIM transfer to a basic address this should remain simple, but defensive verification costs very little.

## Mempool caveat

Nimiq's PoS `getTransactionByHash` does not discover transactions sitting only in the mempool.

That means this is normal:

```text
wallet returned hash
↓
RPC getTransactionByHash(hash)
↓
not found yet
```

Do not show an error immediately.

Use a state such as:

```text
PAYMENT_SUBMITTED
```

and poll with backoff until:
- transaction becomes visible and included
- purchase/payment expires
- an actual invalid state is detected

If useful, a node exposing the mempool query can be used for richer status, but the MVP does not need to depend on mempool visibility.

## Correct finality model

Nimiq PoS uses:
- micro blocks for user transactions
- macro blocks to finalize the batch

A batch consists of 59 micro blocks followed by a macro block, with roughly one block per second. Finality therefore normally arrives at the next macro block, roughly within a minute.

Do not use an arbitrary fixed rule like "6 confirmations means final".

Recommended product states:

```text
PAYMENT_PENDING
  purchase exists, no wallet transaction yet

PAYMENT_SUBMITTED
  wallet returned a tx hash, chain inclusion not yet observed

PAYMENT_DETECTED
  transaction is included and all payment fields match

VERIFIED
  containing batch has been finalized by a macro block

ACTIVE
  verified purchase card is available for after-sales actions
```

`VERIFIED` and `ACTIVE` may be one database transition if product logic is simpler.

## How to determine finality

Preferred robust rule:

1. fetch the included transaction and its `blockHeight`
2. identify the batch containing that block
3. observe that a later/equal closing macro block has finalized that batch
4. only then mark final

Implementation options, in preferred order:

### Option A: use transaction/client state if the chosen Nimiq client exposes explicit finalized/confirmed semantics verified against current docs

Use it only after confirming the exact current enum semantics in installed package types.

### Option B: compare block/batch data

Fetch the transaction's block and current/latest block. Use the block `batch` and `type` information to determine whether the transaction's batch has closed with a macro block.

### Option C: scan to first macro block after inclusion

This is simple and protocol-correct but less efficient. Since a batch is small, it is acceptable as a fallback for the MVP.

Do not hardcode assumptions without tests. Put finality logic in one adapter with unit tests.

## UI behavior

Immediately after payment approval:

```text
Payment sent
Waiting for Nimiq confirmation...
```

Once included and fields match:

```text
Payment detected
Securing purchase...
```

After macro finality:

```text
Purchase verified
```

The customer should never need to understand "micro block" or "macro block".

## Failure states

Handle at least:

```text
WALLET_REJECTED
TX_NOT_YET_VISIBLE
WRONG_RECIPIENT
WRONG_AMOUNT
WRONG_PURCHASE_REFERENCE
WRONG_NETWORK
TX_INVALID
EXECUTION_FAILED
PURCHASE_EXPIRED
TX_REPLACED_OR_CONFLICTING
RPC_UNAVAILABLE
```

Every failure should have a human-readable UI message.

## Non-custodial guarantee

Funds flow:

```text
Buyer Nimiq wallet
        │
        │ direct NIM transfer
        ▼
Merchant Nimiq wallet
```

NimPurchase never holds either party's NIM.

The backend:
- creates expected purchase state
- verifies blockchain facts
- manages receipt/support/reward metadata

It does not sign payments and does not hold private keys.

## Production RPC strategy

For development, an open Nimiq RPC endpoint is fine.

For production:
- hide RPC details behind a server adapter
- configure the endpoint by environment variable
- set request timeout/retry policy
- use health checks
- cache immutable verified transaction details
- make the provider replaceable
- never expose node credentials to the client
- consider a second endpoint or own node only if reliability metrics justify it

## Security invariants

1. Never trust `txHash` alone.
2. Never trust frontend-supplied purchase price after creation.
3. Never trust frontend-supplied merchant wallet.
4. Use the actual chain sender as canonical buyer wallet.
5. One chain reference cannot activate two purchases.
6. One transaction hash cannot activate multiple purchases.
7. Verification endpoint must be idempotent.
8. Purchase reference must be unpredictable enough to prevent casual guessing.
9. Structured receipt data remains server-side/off-chain.
10. No private keys or signing secrets in the application backend.
