# Nimiq Mini App Build Context

This folder is the handoff pack for building the selected Nimiq Mini App with Codex CLI.

Working codename: **NimPurchase**

30-second product sentence:

> NimPurchase turns a direct NIM payment into a verified digital purchase card containing the receipt, purchase details, after-sales support status, and loyalty progress, without taking custody of the buyer's or merchant's money.

## Core rules

1. Anyone should understand the product in about 30 seconds.
2. It must feel like a finished product, not a blockchain demo.
3. Nimiq must be essential to the core workflow.
4. Funds move directly from buyer wallet to merchant wallet.
5. The app is a verifier and purchase-record layer, never a custodian.
6. Build the smallest complete workflow before adding breadth.
7. Prefer NIM first. USDT can be added later.
8. Do not build a full POS, Shopify clone, accounting suite, or generic loyalty platform.
9. Do not put the whole receipt on-chain. Put only a compact purchase reference in Nimiq transaction data.
10. Treat blockchain finality correctly. "Included" and "finalized" are separate UI states.

## Recommended reading order

1. `11-transaction-verification-path.md`
2. `12-prior-art-and-reverse-engineering.md`
3. `13-final-product-definition.md`
4. `14-product-architecture.md`
5. `15-hackathon-alignment.md`
6. `CODEX_MASTER_PROMPT.md`
7. `SOURCES.md`

## Strategic decision

The verification path is clean enough to proceed.

Do final product definition and system architecture in the research chat first, then give Codex CLI the frozen context and let it implement. This avoids letting the coding agent reshape the product around whatever is easiest to code.

Codex should be used for:
- repository inspection
- implementation planning
- scaffolding
- coding
- tests
- integration
- local verification
- deployment preparation

The research chat should remain the source of truth for:
- product scope
- hackathon fit
- judging strategy
- feature cuts
- competitor positioning
- user story clarity
