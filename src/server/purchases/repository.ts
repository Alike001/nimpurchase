import type { Purchase, VerificationAttempt } from './types'

export type VerificationAssignment = 'ASSIGNED' | 'ALREADY_ASSIGNED' | 'TX_REUSED' | 'PURCHASE_CONFLICT'

export interface PurchaseRepository {
  create(purchase: Purchase): Promise<void>
  findById(id: string): Promise<Purchase | undefined>
  assignTransactionHash(purchaseId: string, txHash: string): Promise<VerificationAssignment>
  markPaymentDetected(input: {
    purchaseId: string
    buyerWallet: string
    blockHeight: number
    timestamp?: Date
  }): Promise<void>
  markPaymentMismatch(purchaseId: string): Promise<void>
  activateVerifiedPurchase(purchaseId: string): Promise<{ activated: boolean; rewardCredited: boolean }>
  addVerificationAttempt(attempt: VerificationAttempt): Promise<void>
  listVerificationAttempts(purchaseId: string): Promise<VerificationAttempt[]>
}
