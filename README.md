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

For a phone test, set `PUBLIC_APP_URL` in `.env` to the Vite network address (for example `http://192.168.1.20:5173`), then restart `npm run dev:api`. Open that same address in Nimiq Pay while the computer and device share a network. Merchant checkout links are generated from this value. A normal browser is useful for UI development, but it cannot provide the real Mini App wallet integration.

```sh
npm run test
npm run lint
npm run build
```

## Configuration

`DATABASE_URL`, `NIMIQ_RPC_URL`, `NIMIQ_NETWORK`, and `PUBLIC_APP_URL` are runtime configuration. Do not commit an `.env` file, RPC credentials, or private keys. For the Nimiq Testnet, set `NIMIQ_NETWORK=TestAlbatross` exactly; this matches the transaction network identifier returned by Nimiq RPC.

Use `/merchant` inside Nimiq Pay to create or reopen a merchant workspace. NimPurchase lists the wallet's accounts first, asks the merchant to sign a short-lived sign-in message, and stores only a hashed session token. This proves control of the receiving account without exposing a private key. Manual address entry remains available, but it requires the same wallet confirmation before any sales or support data can be accessed.

## Deployment

Deploy the frontend and API on the same origin, or on subdomains of the same site. This keeps Nimiq Pay wallet-confirmation cookies reliable. Set `PUBLIC_APP_URL` to the exact public HTTPS frontend URL. If the API is on a separate same-site origin, set `VITE_API_BASE_URL` at frontend build time and ensure it is the only allowed CORS origin.

For a single-service deployment, run `npm run build` during the build step and `npm run start` as the start command. The Node service serves the built application and all deep links (including checkout and Purchase Passport links) while continuing to own `/api/*`.

A `Dockerfile` is included for hosts that deploy containers. Give the host the required environment variables securely, let it expose port `8787`, and use the image command as provided. It applies idempotent migrations before starting the service; no `.env` file is copied into the image.

Before release:

```sh
npm ci
npm run db:migrate
npm run test
npm run lint
npm run build
```

The API health check is available at `GET /api/health`. It reports only dependency status, configured network, and current Nimiq block height; it never returns RPC credentials or raw provider errors.

See [the submission checklist](docs/SUBMISSION_CHECKLIST.md) and [the demo script](docs/DEMO_SCRIPT.md).

## License

[MIT](LICENSE)
