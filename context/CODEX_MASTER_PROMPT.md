# Codex CLI Master Prompt

Copy this prompt into Codex CLI from the repository root after adding this context folder to the project.

---

You are the primary implementation agent for a Nimiq Mini Apps Competition project.

Before writing code:

1. Read every file in `context/` completely.
2. Inspect the existing repository, package configuration, git status, and current architecture.
3. Read the current official Nimiq Mini Apps documentation relevant to the installed SDK version if web access is available.
4. Do not invent SDK methods. Check installed package types and official docs.
5. Produce a concrete implementation plan before editing code.
6. Keep the product scope frozen unless a technical blocker requires a change.

## Product

Working name: NimPurchase.

30-second product sentence:

"NimPurchase turns a direct NIM payment into a verified digital purchase card with receipt details, after-sales support, and loyalty progress, without taking custody of the buyer's or merchant's money."

This sentence is the product boundary. Anyone should understand the core flow in roughly 30 seconds.

## Non-negotiable product principles

- Build a real product, not a demo.
- Nimiq must be essential to the core workflow.
- The buyer pays the merchant wallet directly.
- The app must never custody buyer or merchant funds.
- NIM is the MVP payment asset.
- Reliability and completeness matter more than feature count.
- Keep blockchain language out of the main consumer UX.
- Do not build a full POS.
- Do not add AI, NFTs, escrow, HTLCs, OCR, inventory, tax/accounting, or cross-chain features unless explicitly requested later.
- Do not fake chain verification in the judged flow.
- Use real Nimiq Pay wallet confirmation and real Nimiq chain data.

## Required hero flow

Merchant:
1. creates a simple product/purchase
2. sets NIM price
3. receiving Nimiq address is fixed server-side
4. checkout gets a unique compact chain reference

Customer:
1. opens checkout inside Nimiq Pay
2. approves direct NIM payment using `sendBasicTransactionWithData`
3. transaction data contains only the compact purchase reference
4. wallet returns transaction hash
5. app shows payment submitted
6. backend verifies the real transaction
7. app shows payment detected after inclusion
8. app shows verified purchase only after Nimiq macro-block finality
9. purchase card persists and can be reopened
10. purchase card shows reward progress and support action

## Chain verification invariants

Never mark a purchase verified from a tx hash alone.

Verify:
- transaction exists and is included
- returned hash matches
- network matches configured Nimiq network
- recipient exactly equals merchant wallet snapshot
- value exactly equals expected amount in Luna
- transaction data/recipientData decodes to expected chain reference
- transaction is valid when validity field is available
- `executionResult` must not be false
- canonical buyer wallet comes from on-chain transaction sender
- transaction hash is unique across purchases
- purchase reference is unique
- verification is idempotent

Be aware:
- PoS `getTransactionByHash` may not see a transaction while it is only in the mempool
- do not treat temporary "not found" as immediate failure
- Nimiq uses micro blocks for inclusion and macro blocks for finality
- finality occurs at the next macro block, roughly once per minute
- do not replace this with an arbitrary fixed confirmation count

Put all Nimiq RPC provider quirks behind a dedicated adapter.

Normalize differences such as `data` vs `recipientData`.

## Suggested architecture

Frontend:
- React
- TypeScript
- Vite
- `@nimiq/mini-app-sdk`
- mobile-first

Backend:
- TypeScript
- small HTTP API
- relational database
- Nimiq JSON-RPC adapter

No smart contract is required.

Core modules should stay separated:
- merchant
- purchases
- Nimiq payment adapter
- verification/finality
- rewards
- support

## Purchase states

Use a clear state machine:

DRAFT
PAYMENT_PENDING
PAYMENT_SUBMITTED
PAYMENT_DETECTED
VERIFIED
ACTIVE

with explicit error/terminal states where needed.

Do not mix support workflow state into payment state.

## Reward model

MVP reward rule:
- visit/purchase count threshold per merchant

Example:
5 verified purchases → reward entitlement

Reward progress must derive only from verified purchases.
Make reward credit idempotent.

Do not add tokens or complex point economics.

## Support model

A customer can open a support request tied to a verified purchase.

Support is a workflow record, not an on-chain refund system.

Do not claim that the application can reverse NIM transfers.

## Data design

Structured purchase record stays off-chain.

On-chain data is only a compact versioned purchase reference, no PII.

Recommended prefix:
`np:v1:<opaque-id>`

Stay under Nimiq's 64-byte transaction data limit.

## UX

The main customer screen must explain value without blockchain jargon.

Purchase card above the fold:
- merchant
- item/order
- amount
- "Verified with Nimiq"
- date
- reward progress

Secondary details:
- transaction information
- support action
- warranty/return note

Payment status copy:
- "Payment sent. Waiting for confirmation..."
- "Payment detected. Securing purchase..."
- "Purchase verified."

Do not show "micro block", "macro block", raw RPC errors, or huge hashes unless the user opens technical details.

## Hackathon requirements

Keep the final repository:
- public
- MIT licensed
- free of committed secrets/private keys
- actually usable inside Nimiq Pay
- using NIM as a core workflow
- fully functional on first try

The project is judged heavily on functionality, reliability, usefulness, Nimiq integration, real usage, design, and promotion.

Treat error handling and empty/loading states as judged features.

## Testing

At minimum implement tests for:
- chain reference encode/decode
- correct transaction
- wrong merchant
- wrong amount
- wrong purchase reference
- wrong network
- executionResult false
- transaction temporarily missing
- idempotent verification
- tx reuse prevention
- reward credited once
- finality transition

Do not call a task done merely because TypeScript compiles.

Run the available test/build/lint commands after meaningful changes.

## Reverse-engineering guidance

The context research cites products such as:
- Salespage
- Halo
- Cashback ID
- Chomp
- Open Receipt Format / Tommy the Tapir
- OLGAX POS
- Stampee
- Tanda
- Nimiq Flow

Use them only for architectural patterns.

Do not copy their branding or code blindly.
Do not reproduce unrelated infrastructure.
Our key composition is:

merchant purchase
→ direct NIM payment
→ transaction correlation
→ verified purchase card
→ support/reward
→ repeat use

## First task

Do not start coding immediately.

Return:
1. repository audit
2. exact installed stack
3. current Nimiq SDK/API facts verified from installed types/docs
4. proposed file/folder architecture
5. database schema
6. transaction verification algorithm
7. finality algorithm
8. implementation phases
9. risks/blockers
10. exact MVP acceptance criteria

Then implement phase by phase, keeping changes small and tested.
