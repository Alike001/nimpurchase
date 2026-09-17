import { randomUUID } from 'node:crypto'
import { verifyNimiqPayment } from '../nimiq/verify-payment.js'
import type { NimiqChainAdapter, NimiqNetwork } from '../nimiq/types'
import type { PurchaseRepository } from './repository'

export type VerifyPurchaseResult = 'RETRYABLE_NOT_FOUND' | 'DETECTED' | 'FINALIZED' | 'MISMATCH'

export async function verifyPurchasePayment(input: {
  repository: PurchaseRepository
  adapter: NimiqChainAdapter
  purchaseId: string
  txHash: string
  network: NimiqNetwork
}): Promise<VerifyPurchaseResult> {
  const purchase = await input.repository.findById(input.purchaseId)
  if (!purchase) throw new Error('Purchase not found.')
  const assignment = await input.repository.assignTransactionHash(purchase.id, input.txHash)
  if (assignment === 'TX_REUSED') throw new Error('This transaction is already assigned to another purchase.')
  if (assignment === 'PURCHASE_CONFLICT') throw new Error('Purchase already has a different transaction.')
  const validation = await verifyNimiqPayment(input.adapter, {
    txHash: input.txHash, merchantWallet: purchase.merchantWalletSnapshot,
    expectedAmountLuna: purchase.expectedAmountLuna, chainReference: purchase.chainReference, network: input.network,
  })
  if (validation.kind !== 'DETECTED') {
    if (validation.kind === 'MISMATCH') await input.repository.markPaymentMismatch(purchase.id)
    await input.repository.addVerificationAttempt({ id: randomUUID(), purchaseId: purchase.id, txHash: input.txHash,
      outcome: validation.kind === 'MISMATCH' ? validation.reason : validation.kind, retryable: validation.kind === 'RETRYABLE_NOT_FOUND', createdAt: new Date() })
    return validation.kind === 'MISMATCH' ? 'MISMATCH' : 'RETRYABLE_NOT_FOUND'
  }
  await input.repository.markPaymentDetected({ purchaseId: purchase.id, buyerWallet: validation.transaction.sender,
    blockHeight: validation.transaction.blockHeight!, timestamp: validation.transaction.timestamp })
  if (!await input.adapter.isTransactionFinalized(validation.transaction.blockHeight!)) return 'DETECTED'
  await input.repository.activateVerifiedPurchase(purchase.id)
  return 'FINALIZED'
}
