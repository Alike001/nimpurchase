import { createServer } from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { NimiqJsonRpcAdapter } from './nimiq/rpc-client'
import { PostgresPurchaseRepository } from './purchases/postgres-purchase-repository'
import { verifyPurchasePayment } from './purchases/verification-service'

const databaseUrl = process.env.DATABASE_URL
const rpcUrl = process.env.NIMIQ_RPC_URL
const network = process.env.NIMIQ_NETWORK
if (!databaseUrl || !rpcUrl || !network) throw new Error('DATABASE_URL, NIMIQ_RPC_URL, and NIMIQ_NETWORK are required.')
const pool = new Pool({ connectionString: databaseUrl })
const repository = new PostgresPurchaseRepository(pool)
const adapter = new NimiqJsonRpcAdapter(rpcUrl)

async function readJson(request: import('node:http').IncomingMessage): Promise<{ txHash?: string }> {
  let body = ''; for await (const chunk of request) body += String(chunk)
  return JSON.parse(body || '{}') as { txHash?: string }
}
function opaqueId(): string { return [...randomBytes(26)].map((byte) => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[byte % 32]).join('') }
function send(response: import('node:http').ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); response.end(JSON.stringify(body))
}
async function viewPurchase(id: string) {
  const purchase = await repository.findById(id); if (!purchase) return undefined
  const merchant = await pool.query<{ display_name: string }>('SELECT display_name FROM merchants WHERE id = $1', [purchase.merchantId])
  const current = purchase.buyerWallet ? await pool.query<{ count: string }>("SELECT count(*) FROM reward_events WHERE merchant_id = $1 AND buyer_wallet = $2 AND reason = 'VERIFIED_PURCHASE'", [purchase.merchantId, purchase.buyerWallet]) : { rows: [{ count: '0' }] }
  return { id: purchase.id, merchantName: merchant.rows[0]?.display_name ?? 'Merchant', merchantWallet: purchase.merchantWalletSnapshot,
    itemSummary: purchase.items.map((item) => item.quantity > 1 ? `${item.quantity} × ${item.name}` : item.name).join(', '), expectedAmountLuna: purchase.expectedAmountLuna,
    chainReference: purchase.chainReference, status: purchase.status, buyerWallet: purchase.buyerWallet, expiresAt: purchase.expiresAt.toISOString(), purchasedAt: purchase.paymentDetectedAt?.toISOString(),
    reward: { current: Number(current.rows[0].count), threshold: purchase.rewardRuleSnapshot.threshold, description: purchase.rewardRuleSnapshot.rewardDescription } }
}

createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') return send(response, 204, {})
    const url = new URL(request.url ?? '/', 'http://localhost')
    const match = url.pathname.match(/^\/api\/purchases\/([^/]+)(?:\/(payment|verify))?$/)
    if (request.method === 'POST' && url.pathname === '/api/merchants') {
      const body = await readJson(request) as { displayName?: string; walletAddress?: string }
      if (!body.displayName || !body.walletAddress) return send(response, 400, { error: 'Merchant name and receiving address are required.' })
      const id = randomUUID(); const slug = `${body.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${id.slice(0, 8)}`
      await pool.query('INSERT INTO merchants (id, display_name, wallet_address, slug) VALUES ($1,$2,$3,$4)', [id, body.displayName, body.walletAddress, slug])
      return send(response, 201, { id, displayName: body.displayName, walletAddress: body.walletAddress })
    }
    const merchantMatch = url.pathname.match(/^\/api\/merchants\/([^/]+)\/purchases$/)
    if (request.method === 'POST' && merchantMatch) {
      const body = await readJson(request) as { itemName?: string; description?: string; priceLuna?: number; warrantyNote?: string; returnNote?: string; threshold?: number; rewardDescription?: string }
      const merchant = await pool.query<{ wallet_address: string }>('SELECT wallet_address FROM merchants WHERE id = $1', [merchantMatch[1]])
      const priceLuna = body.priceLuna
      if (!merchant.rows[0] || !body.itemName || typeof priceLuna !== 'number' || !Number.isSafeInteger(priceLuna) || priceLuna <= 0) return send(response, 400, { error: 'A merchant, item name, and positive Luna price are required.' })
      const id = randomUUID(); const chainReference = `np:v1:${opaqueId()}`; const now = new Date(); const expiresAt = new Date(now.getTime() + 30 * 60_000)
      await repository.create({ id, chainReference: chainReference as `np:v1:${string}`, merchantId: merchantMatch[1], merchantWalletSnapshot: merchant.rows[0].wallet_address, expectedAmountLuna: priceLuna, currency: 'NIM', rewardRuleSnapshot: { type: 'VISIT_COUNT', threshold: body.threshold && body.threshold > 0 ? body.threshold : 5, rewardDescription: body.rewardDescription || 'Reward available' }, warrantyNote: body.warrantyNote, returnNote: body.returnNote, status: 'PAYMENT_PENDING', createdAt: now, expiresAt, items: [{ id: randomUUID(), name: body.itemName, quantity: 1, unitPriceLuna: priceLuna, lineTotalLuna: priceLuna }] })
      return send(response, 201, { id, checkoutPath: `/checkout/${id}` })
    }
    if (request.method === 'GET' && merchantMatch) {
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
