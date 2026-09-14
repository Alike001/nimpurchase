import { assertPurchaseTransition } from '../../shared/purchase-state'
import type { Purchase, VerificationAttempt } from './types'
import type { PurchaseRepository, VerificationAssignment } from './repository'

export class InMemoryPurchaseRepository implements PurchaseRepository {
  private readonly purchases = new Map<string, Purchase>()
  private readonly transactionOwners = new Map<string, string>()
  private readonly attempts: VerificationAttempt[] = []
  private readonly creditedPurchases = new Set<string>()

  public async create(purchase: Purchase): Promise<void> {
    if ([...this.purchases.values()].some((value) => value.chainReference === purchase.chainReference)) {
      throw new Error('Purchase reference already exists.')
    }
    this.purchases.set(purchase.id, structuredClone(purchase))
  }

  public async findById(id: string): Promise<Purchase | undefined> {
    const purchase = this.purchases.get(id)
    return purchase && structuredClone(purchase)
  }

  public async assignTransactionHash(purchaseId: string, txHash: string): Promise<VerificationAssignment> {
    const purchase = this.purchases.get(purchaseId)
    if (!purchase) throw new Error('Purchase not found.')
    const owner = this.transactionOwners.get(txHash)
    if (owner && owner !== purchaseId) return 'TX_REUSED'
    if (purchase.txHash && purchase.txHash !== txHash) return 'PURCHASE_CONFLICT'
    if (purchase.txHash === txHash) return 'ALREADY_ASSIGNED'
    this.transactionOwners.set(txHash, purchaseId)
    purchase.txHash = txHash
    if (purchase.status === 'PAYMENT_PENDING') purchase.status = 'PAYMENT_SUBMITTED'
    return 'ASSIGNED'
  }

  public async markPaymentDetected(input: { purchaseId: string; buyerWallet: string; blockHeight: number; timestamp?: Date }): Promise<void> {
    const purchase = this.purchases.get(input.purchaseId)
    if (!purchase) throw new Error('Purchase not found.')
    if (purchase.status === 'ACTIVE') return
    if (purchase.status === 'PAYMENT_SUBMITTED') assertPurchaseTransition(purchase.status, 'PAYMENT_DETECTED')
    purchase.status = 'PAYMENT_DETECTED'
    purchase.buyerWallet = input.buyerWallet
    purchase.txBlockHeight = input.blockHeight
    purchase.txTimestamp = input.timestamp
    purchase.paymentDetectedAt ??= new Date()
  }

  public async markPaymentMismatch(purchaseId: string): Promise<void> {
    const purchase = this.purchases.get(purchaseId)
    if (!purchase) throw new Error('Purchase not found.')
    if (purchase.status === 'PAYMENT_SUBMITTED') purchase.status = 'PAYMENT_MISMATCH'
  }

  public async activateVerifiedPurchase(purchaseId: string): Promise<{ activated: boolean; rewardCredited: boolean }> {
    const purchase = this.purchases.get(purchaseId)
    if (!purchase) throw new Error('Purchase not found.')
    if (purchase.status === 'ACTIVE') return { activated: false, rewardCredited: false }
    purchase.finalizedAt ??= new Date()
    assertPurchaseTransition(purchase.status, 'ACTIVE')
    purchase.status = 'ACTIVE'
    const rewardCredited = !this.creditedPurchases.has(purchaseId)
    this.creditedPurchases.add(purchaseId)
    return { activated: true, rewardCredited }
  }

  public async addVerificationAttempt(attempt: VerificationAttempt): Promise<void> {
    this.attempts.push(structuredClone(attempt))
  }

  public async listVerificationAttempts(purchaseId: string): Promise<VerificationAttempt[]> {
    return this.attempts.filter((attempt) => attempt.purchaseId === purchaseId).map((attempt) => structuredClone(attempt))
  }
}
