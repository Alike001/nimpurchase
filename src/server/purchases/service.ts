import { assertLuna } from '../../shared/money.js'
import { assertPurchaseTransition } from '../../shared/purchase-state.js'
import type { Purchase, CreatePurchaseInput } from './types'
import type { PurchaseRepository } from './repository'

export async function createPurchase(repository: PurchaseRepository, input: CreatePurchaseInput): Promise<Purchase> {
  assertLuna(input.expectedAmountLuna)
  if (input.expiresAt <= input.createdAt) throw new Error('Purchase expiry must be after creation.')
  if (input.items.length === 0) throw new Error('A purchase needs at least one item.')
  if (input.items.some((item) => item.quantity <= 0 || item.lineTotalLuna !== item.quantity * item.unitPriceLuna)) {
    throw new Error('Purchase item totals must be positive and internally consistent.')
  }
  if (input.items.reduce((total, item) => total + item.lineTotalLuna, 0) !== input.expectedAmountLuna) {
    throw new Error('Purchase item totals must equal the expected payment amount.')
  }

  const purchase: Purchase = { ...input, currency: 'NIM', status: 'PAYMENT_PENDING' }
  await repository.create(purchase)
  return purchase
}

export async function submitPurchasePayment(repository: PurchaseRepository, purchaseId: string, txHash: string): Promise<void> {
  const purchase = await repository.findById(purchaseId)
  if (!purchase) throw new Error('Purchase not found.')
  if (purchase.status === 'PAYMENT_PENDING') assertPurchaseTransition(purchase.status, 'PAYMENT_SUBMITTED')
  const assignment = await repository.assignTransactionHash(purchaseId, txHash)
  if (assignment === 'TX_REUSED') throw new Error('This transaction is already assigned to another purchase.')
  if (assignment === 'PURCHASE_CONFLICT') throw new Error('Purchase already has a different transaction.')
}
