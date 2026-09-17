import { createServer } from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { NimiqJsonRpcAdapter } from './nimiq/rpc-client'
import { PostgresPurchaseRepository } from './purchases/postgres-purchase-repository'
import { verifyPurchasePayment } from './purchases/verification-service'
import { canonicalizeNimiqAddress, isMerchantAuthChallengeUsable, verifyNimiqSignedMessage } from './auth/nimiq-signature'
import { createSessionToken, expiredSessionCookie, hashSessionToken, merchantSessionCookie, merchantSessionLifetimeSeconds, readCookie, sessionCookie } from './auth/session'

const databaseUrl = process.env.DATABASE_URL
const rpcUrl = process.env.NIMIQ_RPC_URL
const network = process.env.NIMIQ_NETWORK
const publicAppUrl = process.env.PUBLIC_APP_URL
if (!databaseUrl || !rpcUrl || !network || !publicAppUrl) throw new Error('DATABASE_URL, NIMIQ_RPC_URL, NIMIQ_NETWORK, and PUBLIC_APP_URL are required.')
const publicAppOrigin = new URL(publicAppUrl).origin
const pool = new Pool({ connectionString: databaseUrl })
const repository = new PostgresPurchaseRepository(pool)
const adapter = new NimiqJsonRpcAdapter(rpcUrl)
const secureCookies = publicAppOrigin.startsWith('https://')

async function readJson(request: import('node:http').IncomingMessage): Promise<{ txHash?: string }> {
  let body = ''; for await (const chunk of request) body += String(chunk)
  return JSON.parse(body || '{}') as { txHash?: string }
}
function opaqueId(): string { return [...randomBytes(26)].map((byte) => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[byte % 32]).join('') }
function send(response: import('node:http').ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': publicAppOrigin, 'access-control-allow-credentials': 'true', ...headers }); response.end(JSON.stringify(body))
}
async function authenticatedMerchantId(request: import('node:http').IncomingMessage): Promise<string | undefined> {
  const token = readCookie(request.headers.cookie, merchantSessionCookie)
  if (!token) return undefined
  const result = await pool.query<{ merchant_id: string }>('SELECT merchant_id FROM merchant_sessions WHERE token_hash = $1 AND expires_at > now()', [hashSessionToken(token)])
  return result.rows[0]?.merchant_id
}
async function viewPurchase(id: string) {
  const purchase = await repository.findById(id); if (!purchase) return undefined
  const merchant = await pool.query<{ display_name: string }>('SELECT display_name FROM merchants WHERE id = $1', [purchase.merchantId])
  const current = purchase.buyerWallet ? await pool.query<{ count: string }>("SELECT count(*) FROM reward_events WHERE merchant_id = $1 AND buyer_wallet = $2 AND reason = 'VERIFIED_PURCHASE'", [purchase.merchantId, purchase.buyerWallet]) : { rows: [{ count: '0' }] }
  return { id: purchase.id, merchantName: merchant.rows[0]?.display_name ?? 'Merchant', merchantWallet: purchase.merchantWalletSnapshot,
    itemSummary: purchase.items.map((item) => item.quantity > 1 ? `${item.quantity} × ${item.name}` : item.name).join(', '), itemDescription: purchase.items[0]?.description, expectedAmountLuna: purchase.expectedAmountLuna,
    chainReference: purchase.chainReference, status: purchase.status, expiresAt: purchase.expiresAt.toISOString(), purchasedAt: purchase.paymentDetectedAt?.toISOString(),
    warrantyNote: purchase.warrantyNote, returnNote: purchase.returnNote,
    reward: { current: Number(current.rows[0].count), threshold: purchase.rewardRuleSnapshot.threshold, description: purchase.rewardRuleSnapshot.rewardDescription } }
}

createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') return send(response, 204, {}, {
      'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
      'access-control-allow-headers': 'content-type',
    })
    const url = new URL(request.url ?? '/', 'http://localhost')
    const match = url.pathname.match(/^\/api\/purchases\/([^/]+)(?:\/(payment|verify))?$/)
    if (request.method === 'GET' && url.pathname === '/api/health') {
      const [database, nimiq] = await Promise.allSettled([
        pool.query('SELECT 1'),
        adapter.getLatestBlockHeight(),
      ])
      const healthy = database.status === 'fulfilled' && nimiq.status === 'fulfilled'
      return send(response, healthy ? 200 : 503, {
        status: healthy ? 'ok' : 'degraded',
        database: database.status === 'fulfilled' ? 'ok' : 'unavailable',
        nimiq: nimiq.status === 'fulfilled' ? { status: 'ok', network, latestBlockHeight: nimiq.value } : { status: 'unavailable', network },
      })
    }
    if (request.method === 'POST' && url.pathname === '/api/merchant-auth/challenge') {
      const body = await readJson(request) as { displayName?: string; walletAddress?: string }
      if (!body.displayName?.trim() || body.displayName.trim().length > 100 || !body.walletAddress) return send(response, 400, { error: 'Merchant name and receiving address are required.' })
      let walletAddress: string
      try { walletAddress = canonicalizeNimiqAddress(body.walletAddress) } catch { return send(response, 400, { error: 'Enter a valid Nimiq receiving address.' }) }
      const id = randomUUID(); const expiresAt = new Date(Date.now() + 5 * 60_000); const nonce = randomBytes(24).toString('base64url')
      const message = `Sign in to NimPurchase\n\nReceiving account: ${walletAddress}\nWebsite: ${publicAppOrigin}\nRequest: ${nonce}\nExpires: ${expiresAt.toISOString()}`
      await pool.query('INSERT INTO merchant_auth_challenges (id, wallet_address, display_name, message, expires_at) VALUES ($1,$2,$3,$4,$5)', [id, walletAddress, body.displayName.trim(), message, expiresAt])
      return send(response, 201, { challengeId: id, message, expiresAt: expiresAt.toISOString() })
    }
    if (request.method === 'POST' && url.pathname === '/api/merchant-auth/verify') {
      const body = await readJson(request) as { challengeId?: string; publicKey?: string; signature?: string }
      if (!body.challengeId || !body.publicKey || !body.signature) return send(response, 400, { error: 'The wallet confirmation response is incomplete.' })
      const challenge = await pool.query<{ id: string; wallet_address: string; display_name: string; message: string; expires_at: Date; used_at: Date | null }>('SELECT id, wallet_address, display_name, message, expires_at, used_at FROM merchant_auth_challenges WHERE id = $1', [body.challengeId])
      const proof = challenge.rows[0]
      if (!proof || !isMerchantAuthChallengeUsable({ expiresAt: proof.expires_at, usedAt: proof.used_at }) || !verifyNimiqSignedMessage({ message: proof.message, publicKeyHex: body.publicKey, signatureHex: body.signature, expectedAddress: proof.wallet_address })) return send(response, 401, { error: 'Wallet confirmation was invalid or expired. Please try again.' })
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const consumed = await client.query('UPDATE merchant_auth_challenges SET used_at = now() WHERE id = $1 AND used_at IS NULL AND expires_at > now() RETURNING id', [proof.id])
        if (!consumed.rowCount) { await client.query('ROLLBACK'); return send(response, 401, { error: 'This wallet confirmation has already been used.' }) }
        const id = randomUUID(); const slug = `${proof.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${id.slice(0, 8)}`
        const merchant = await client.query<{ id: string; display_name: string; wallet_address: string }>('INSERT INTO merchants (id, display_name, wallet_address, slug) VALUES ($1,$2,$3,$4) ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = EXCLUDED.wallet_address RETURNING id, display_name, wallet_address', [id, proof.display_name, proof.wallet_address, slug])
        const token = createSessionToken(); const expiresAt = new Date(Date.now() + merchantSessionLifetimeSeconds * 1000)
        await client.query('INSERT INTO merchant_sessions (id, merchant_id, token_hash, expires_at) VALUES ($1,$2,$3,$4)', [randomUUID(), merchant.rows[0].id, hashSessionToken(token), expiresAt])
        await client.query('COMMIT')
        return send(response, 200, { id: merchant.rows[0].id, displayName: merchant.rows[0].display_name, walletAddress: merchant.rows[0].wallet_address }, { 'set-cookie': sessionCookie(token, secureCookies) })
      } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
    }
    if (request.method === 'POST' && url.pathname === '/api/merchant-auth/logout') {
      const token = readCookie(request.headers.cookie, merchantSessionCookie)
      if (token) await pool.query('DELETE FROM merchant_sessions WHERE token_hash = $1', [hashSessionToken(token)])
      return send(response, 200, {}, { 'set-cookie': expiredSessionCookie(secureCookies) })
    }
    if (request.method === 'GET' && url.pathname === '/api/merchant-auth/session') {
      const merchantId = await authenticatedMerchantId(request)
      if (!merchantId) return send(response, 401, { error: 'Confirm your merchant account to continue.' })
      const merchant = await pool.query<{ id: string; display_name: string; wallet_address: string }>('SELECT id, display_name, wallet_address FROM merchants WHERE id = $1', [merchantId])
      if (!merchant.rows[0]) return send(response, 401, { error: 'Confirm your merchant account to continue.' })
      return send(response, 200, {
        id: merchant.rows[0].id,
        displayName: merchant.rows[0].display_name,
        walletAddress: merchant.rows[0].wallet_address,
      })
    }
    const merchantMatch = url.pathname.match(/^\/api\/merchants\/([^/]+)\/purchases$/)
    const supportMatch = url.pathname.match(/^\/api\/purchases\/([^/]+)\/support$/)
    const supportChallengeMatch = url.pathname.match(/^\/api\/purchases\/([^/]+)\/support\/challenge$/)
    if (request.method === 'POST' && supportChallengeMatch) {
      const purchase = await repository.findById(supportChallengeMatch[1])
      if (!purchase || purchase.status !== 'ACTIVE' || !purchase.buyerWallet) return send(response, 400, { error: 'Support is available only for an active purchase.' })
      const id = randomUUID(); const expiresAt = new Date(Date.now() + 5 * 60_000); const nonce = randomBytes(24).toString('base64url')
      const message = `Request support for a verified NimPurchase\n\nPurchase card: ${purchase.id}\nWebsite: ${publicAppOrigin}\nRequest: ${nonce}\nExpires: ${expiresAt.toISOString()}`
      await pool.query('INSERT INTO support_auth_challenges (id, purchase_id, wallet_address, message, expires_at) VALUES ($1,$2,$3,$4,$5)', [id, purchase.id, purchase.buyerWallet, message, expiresAt])
      return send(response, 201, { challengeId: id, message, expiresAt: expiresAt.toISOString() })
    }
    if (request.method === 'POST' && supportMatch) {
      const body = await readJson(request) as { challengeId?: string; publicKey?: string; signature?: string; message?: string }
      const purchase = await repository.findById(supportMatch[1])
      if (!purchase || purchase.status !== 'ACTIVE' || !purchase.buyerWallet || !body.challengeId || !body.publicKey || !body.signature || !body.message?.trim() || body.message.trim().length > 1000) return send(response, 400, { error: 'Support is available only for your active purchase.' })
      const challenge = await pool.query<{ id: string; wallet_address: string; message: string; expires_at: Date; used_at: Date | null }>('SELECT id, wallet_address, message, expires_at, used_at FROM support_auth_challenges WHERE id = $1 AND purchase_id = $2', [body.challengeId, purchase.id])
      const proof = challenge.rows[0]
      if (!proof || !isMerchantAuthChallengeUsable({ expiresAt: proof.expires_at, usedAt: proof.used_at }) || !verifyNimiqSignedMessage({ message: proof.message, publicKeyHex: body.publicKey, signatureHex: body.signature, expectedAddress: purchase.buyerWallet })) return send(response, 401, { error: 'Wallet confirmation was invalid or expired. Please try again.' })
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const consumed = await client.query('UPDATE support_auth_challenges SET used_at = now() WHERE id = $1 AND purchase_id = $2 AND used_at IS NULL AND expires_at > now() RETURNING id', [proof.id, purchase.id])
        if (!consumed.rowCount) { await client.query('ROLLBACK'); return send(response, 401, { error: 'This wallet confirmation has already been used.' }) }
        const id = randomUUID(); await client.query('INSERT INTO support_requests (id, purchase_id, buyer_wallet, status, message) VALUES ($1,$2,$3,$4,$5)', [id, purchase.id, purchase.buyerWallet, 'OPEN', body.message.trim()])
        await client.query('COMMIT')
        return send(response, 201, { id, status: 'OPEN' })
      } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
    }
    const merchantSupportMatch = url.pathname.match(/^\/api\/merchants\/([^/]+)\/support(?:\/([^/]+))?$/)
    if (request.method === 'GET' && merchantSupportMatch) {
      if (await authenticatedMerchantId(request) !== merchantSupportMatch[1]) return send(response, 401, { error: 'Confirm your merchant account to continue.' })
      const rows = await pool.query('SELECT s.id, s.purchase_id AS "purchaseId", s.status, s.message, s.created_at AS "createdAt" FROM support_requests s JOIN purchases p ON p.id = s.purchase_id WHERE p.merchant_id = $1 ORDER BY s.created_at DESC', [merchantSupportMatch[1]])
      return send(response, 200, rows.rows)
    }
    if (request.method === 'PATCH' && merchantSupportMatch?.[2]) {
      if (await authenticatedMerchantId(request) !== merchantSupportMatch[1]) return send(response, 401, { error: 'Confirm your merchant account to continue.' })
      const body = await readJson(request) as { status?: string }; if (!['OPEN', 'IN_REVIEW', 'RESOLVED'].includes(body.status ?? '')) return send(response, 400, { error: 'Invalid support status.' })
      await pool.query('UPDATE support_requests SET status = $1, updated_at = now() WHERE id = $2 AND purchase_id IN (SELECT id FROM purchases WHERE merchant_id = $3)', [body.status, merchantSupportMatch[2], merchantSupportMatch[1]])
      return send(response, 200, { status: body.status })
    }
    if (request.method === 'POST' && merchantMatch) {
      if (await authenticatedMerchantId(request) !== merchantMatch[1]) return send(response, 401, { error: 'Confirm your merchant account to continue.' })
      const body = await readJson(request) as { itemName?: string; description?: string; priceLuna?: number; warrantyNote?: string; returnNote?: string; threshold?: number; rewardDescription?: string }
      const merchant = await pool.query<{ wallet_address: string }>('SELECT wallet_address FROM merchants WHERE id = $1', [merchantMatch[1]])
      const priceLuna = body.priceLuna
      if (!merchant.rows[0] || !body.itemName || typeof priceLuna !== 'number' || !Number.isSafeInteger(priceLuna) || priceLuna <= 0) return send(response, 400, { error: 'A merchant, item name, and positive Luna price are required.' })
      const id = randomUUID(); const chainReference = `np:v1:${opaqueId()}`; const now = new Date(); const expiresAt = new Date(now.getTime() + 30 * 60_000)
      await repository.create({ id, chainReference: chainReference as `np:v1:${string}`, merchantId: merchantMatch[1], merchantWalletSnapshot: merchant.rows[0].wallet_address, expectedAmountLuna: priceLuna, currency: 'NIM', rewardRuleSnapshot: { type: 'VISIT_COUNT', threshold: body.threshold && body.threshold > 0 ? body.threshold : 5, rewardDescription: body.rewardDescription || 'Reward available' }, warrantyNote: body.warrantyNote, returnNote: body.returnNote, status: 'PAYMENT_PENDING', createdAt: now, expiresAt, items: [{ id: randomUUID(), name: body.itemName, description: body.description?.trim() || undefined, quantity: 1, unitPriceLuna: priceLuna, lineTotalLuna: priceLuna }] })
      const checkoutPath = `/checkout/${id}`
      return send(response, 201, { id, checkoutPath, checkoutUrl: new URL(checkoutPath, publicAppOrigin).toString() })
    }
    if (request.method === 'GET' && merchantMatch) {
      if (await authenticatedMerchantId(request) !== merchantMatch[1]) return send(response, 401, { error: 'Confirm your merchant account to continue.' })
      const ids = await pool.query<{ id: string }>('SELECT id FROM purchases WHERE merchant_id = $1 ORDER BY created_at DESC', [merchantMatch[1]])
      return send(response, 200, await Promise.all(ids.rows.map(({ id }) => viewPurchase(id))))
    }
    if (request.method === 'GET' && url.pathname === '/api/purchases') {
      const wallet = url.searchParams.get('buyerWallet'); if (!wallet) return send(response, 400, { error: 'Buyer wallet is required.' })
      const ids = await pool.query<{ id: string }>("SELECT id FROM purchases WHERE buyer_wallet = $1 AND status = 'ACTIVE' ORDER BY payment_detected_at DESC", [wallet])
      return send(response, 200, await Promise.all(ids.rows.map(({ id }) => viewPurchase(id))))
    }
    if (request.method === 'GET' && match?.[1] && !match[2]) { const view = await viewPurchase(match[1]); return send(response, view ? 200 : 404, view ?? { error: 'Purchase not found.' }) }
    if (request.method === 'POST' && match?.[1] && (match[2] === 'payment' || match[2] === 'verify')) {
      const { txHash: suppliedTxHash } = await readJson(request); const stored = await repository.findById(match[1]); const txHash = suppliedTxHash ?? stored?.txHash
      if (!txHash) return send(response, 400, { error: 'Transaction hash is required.' })
      const status = await verifyPurchasePayment({ repository, adapter, purchaseId: match[1], txHash, network })
      return send(response, 200, { status: status === 'FINALIZED' ? 'ACTIVE' : status === 'DETECTED' ? 'PAYMENT_DETECTED' : status === 'RETRYABLE_NOT_FOUND' ? 'PAYMENT_SUBMITTED' : 'PAYMENT_MISMATCH' })
    }
    return send(response, 404, { error: 'Not found.' })
  } catch { return send(response, 500, { error: 'We could not check this purchase right now.' }) }
}).listen(Number(process.env.PORT ?? 8787))
