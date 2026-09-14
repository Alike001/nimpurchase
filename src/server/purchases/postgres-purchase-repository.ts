import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import type { PurchaseRepository, VerificationAssignment } from './repository'
import type { Purchase, VerificationAttempt } from './types'

type PurchaseRow = Omit<Purchase, 'chainReference' | 'merchantId' | 'merchantWalletSnapshot' | 'expectedAmountLuna' | 'rewardRuleSnapshot' | 'txHash' | 'buyerWallet' | 'txBlockHeight' | 'txTimestamp' | 'paymentDetectedAt' | 'finalizedAt' | 'createdAt' | 'expiresAt'> & {
  chain_reference: string; merchant_id: string; merchant_wallet_snapshot: string; expected_amount_luna: string
  reward_rule_snapshot: Purchase['rewardRuleSnapshot']; tx_hash: string | null; buyer_wallet: string | null
  tx_block_height: string | null; tx_timestamp: Date | null; payment_detected_at: Date | null; finalized_at: Date | null
  created_at: Date; expires_at: Date
}

function mapPurchase(row: PurchaseRow, items: Purchase['items'] = []): Purchase {
  return {
    id: row.id, chainReference: row.chain_reference as Purchase['chainReference'], merchantId: row.merchant_id,
    merchantWalletSnapshot: row.merchant_wallet_snapshot, expectedAmountLuna: Number(row.expected_amount_luna),
    currency: 'NIM', rewardRuleSnapshot: row.reward_rule_snapshot, warrantyNote: row.warrantyNote,
    returnNote: row.returnNote, status: row.status, txHash: row.tx_hash ?? undefined, buyerWallet: row.buyer_wallet ?? undefined,
    txBlockHeight: row.tx_block_height === null ? undefined : Number(row.tx_block_height), txTimestamp: row.tx_timestamp ?? undefined,
    paymentDetectedAt: row.payment_detected_at ?? undefined, finalizedAt: row.finalized_at ?? undefined,
    createdAt: row.created_at, expiresAt: row.expires_at, items,
  }
}

export class PostgresPurchaseRepository implements PurchaseRepository {
  public constructor(private readonly pool: Pool) {}

  public async create(purchase: Purchase): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO purchases (id, chain_reference, merchant_id, merchant_wallet_snapshot, expected_amount_luna, currency, reward_rule_snapshot, warranty_note, return_note, status, created_at, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [purchase.id, purchase.chainReference, purchase.merchantId, purchase.merchantWalletSnapshot, purchase.expectedAmountLuna,
          purchase.currency, purchase.rewardRuleSnapshot, purchase.warrantyNote ?? null, purchase.returnNote ?? null, purchase.status,
          purchase.createdAt, purchase.expiresAt],
      )
      for (const item of purchase.items) {
        await client.query(
          'INSERT INTO purchase_items (id, purchase_id, name, quantity, unit_price_luna, line_total_luna) VALUES ($1,$2,$3,$4,$5,$6)',
          [item.id, purchase.id, item.name, item.quantity, item.unitPriceLuna, item.lineTotalLuna],
        )
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally { client.release() }
  }

  public async findById(id: string): Promise<Purchase | undefined> {
    const purchaseResult = await this.pool.query<PurchaseRow>('SELECT * FROM purchases WHERE id = $1', [id])
    const row = purchaseResult.rows[0]
    if (!row) return undefined
    const itemResult = await this.pool.query<Purchase['items'][number]>(
      'SELECT id, name, quantity, unit_price_luna AS "unitPriceLuna", line_total_luna AS "lineTotalLuna" FROM purchase_items WHERE purchase_id = $1', [id],
    )
    return mapPurchase(row, itemResult.rows.map((item) => ({ ...item, unitPriceLuna: Number(item.unitPriceLuna), lineTotalLuna: Number(item.lineTotalLuna) })))
  }

  public async assignTransactionHash(purchaseId: string, txHash: string): Promise<VerificationAssignment> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const existingHash = await client.query<{ id: string }>('SELECT id FROM purchases WHERE tx_hash = $1 FOR UPDATE', [txHash])
      if (existingHash.rows[0] && existingHash.rows[0].id !== purchaseId) { await client.query('ROLLBACK'); return 'TX_REUSED' }
      const purchase = await client.query<{ tx_hash: string | null }>('SELECT tx_hash FROM purchases WHERE id = $1 FOR UPDATE', [purchaseId])
      if (!purchase.rows[0]) throw new Error('Purchase not found.')
      if (purchase.rows[0].tx_hash && purchase.rows[0].tx_hash !== txHash) { await client.query('ROLLBACK'); return 'PURCHASE_CONFLICT' }
      if (purchase.rows[0].tx_hash === txHash) { await client.query('COMMIT'); return 'ALREADY_ASSIGNED' }
      await client.query("UPDATE purchases SET tx_hash = $1, status = CASE WHEN status = 'PAYMENT_PENDING' THEN 'PAYMENT_SUBMITTED'::purchase_status ELSE status END WHERE id = $2", [txHash, purchaseId])
      await client.query('COMMIT'); return 'ASSIGNED'
    } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
  }

  public async markPaymentDetected(input: { purchaseId: string; buyerWallet: string; blockHeight: number; timestamp?: Date }): Promise<void> {
    await this.pool.query(
      "UPDATE purchases SET status = 'PAYMENT_DETECTED', buyer_wallet = $1, tx_block_height = $2, tx_timestamp = $3, payment_detected_at = COALESCE(payment_detected_at, now()) WHERE id = $4 AND status IN ('PAYMENT_SUBMITTED', 'PAYMENT_DETECTED')",
      [input.buyerWallet, input.blockHeight, input.timestamp ?? null, input.purchaseId],
    )
  }

  public async markPaymentMismatch(purchaseId: string): Promise<void> {
    await this.pool.query("UPDATE purchases SET status = 'PAYMENT_MISMATCH' WHERE id = $1 AND status = 'PAYMENT_SUBMITTED'", [purchaseId])
  }

  public async activateVerifiedPurchase(purchaseId: string): Promise<{ activated: boolean; rewardCredited: boolean }> {
    return this.withTransaction(async (client) => {
      const result = await client.query<{ status: Purchase['status']; merchant_id: string; buyer_wallet: string | null }>('SELECT status, merchant_id, buyer_wallet FROM purchases WHERE id = $1 FOR UPDATE', [purchaseId])
      const purchase = result.rows[0]
      if (!purchase) throw new Error('Purchase not found.')
      if (purchase.status === 'ACTIVE') return { activated: false, rewardCredited: false }
      if (purchase.status !== 'PAYMENT_DETECTED') throw new Error('Purchase is not awaiting finality.')
      await client.query("UPDATE purchases SET status = 'ACTIVE', finalized_at = COALESCE(finalized_at, now()) WHERE id = $1", [purchaseId])
      const credit = await client.query(
        "INSERT INTO reward_events (id, merchant_id, buyer_wallet, purchase_id, delta, reason) VALUES ($1,$2,$3,$4,1,'VERIFIED_PURCHASE') ON CONFLICT (purchase_id, reason) DO NOTHING RETURNING id",
        [randomUUID(), purchase.merchant_id, purchase.buyer_wallet, purchaseId],
      )
      return { activated: true, rewardCredited: credit.rowCount === 1 }
    })
  }

  public async addVerificationAttempt(attempt: VerificationAttempt): Promise<void> {
    await this.pool.query(
      'INSERT INTO verification_attempts (id, purchase_id, tx_hash, outcome, detail, retryable, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [attempt.id, attempt.purchaseId, attempt.txHash, attempt.outcome, attempt.detail ?? null, attempt.retryable, attempt.createdAt],
    )
  }

  public async listVerificationAttempts(purchaseId: string): Promise<VerificationAttempt[]> {
    const result = await this.pool.query<VerificationAttempt>(
      'SELECT id, purchase_id AS "purchaseId", tx_hash AS "txHash", outcome, detail, retryable, created_at AS "createdAt" FROM verification_attempts WHERE purchase_id = $1 ORDER BY created_at', [purchaseId],
    )
    return result.rows
  }

  private async withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try { await client.query('BEGIN'); const value = await operation(client); await client.query('COMMIT'); return value }
    catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
  }
}
