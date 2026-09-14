# NimPurchase

NimPurchase turns a direct NIM payment into a verified digital purchase card with receipt details, after-sales support, and loyalty progress—without taking custody of either party's money.

## Product boundary

The buyer sends NIM directly to the merchant's server-snapshotted wallet. NimPurchase places only a compact, versioned purchase reference in transaction data, verifies the included transaction through a server-side Nimiq RPC adapter, and activates the card only after macro-block finality.

It is not a POS, inventory system, accounting product, refund mechanism, NFT product, or custody service.

## Local development

```sh
cp .env.example .env
npm install
npm run db:migrate
npm run dev:api
npm run dev -- --host
```

`npm run db:migrate` uses the app's PostgreSQL driver, so it does not require the separate `psql` command-line program. The API command loads `.env` itself. With Node 22+ this uses Node's built-in `--env-file` support; an already-set shell variable still takes precedence.

Open the displayed network URL in Nimiq Pay while the computer and device share a network. A normal browser is useful for UI development, but it cannot provide the real Mini App wallet integration.

```sh
npm run test
npm run lint
npm run build
```

## Configuration

`DATABASE_URL`, `NIMIQ_RPC_URL`, `NIMIQ_NETWORK`, and `PUBLIC_APP_URL` are runtime configuration. Do not commit an `.env` file, RPC credentials, or private keys. For the Nimiq Testnet, set `NIMIQ_NETWORK=TestAlbatross` exactly; this matches the transaction network identifier returned by Nimiq RPC.

Use `/merchant` to create the first merchant profile and checkout. This keeps the receiving wallet server-side and avoids a committed seed wallet.

## License

[MIT](LICENSE)
