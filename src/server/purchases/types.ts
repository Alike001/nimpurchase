import type { ChainReference } from '../../shared/chain-reference'
import type { PurchaseStatus } from '../../shared/purchase-state'

export type RewardRuleSnapshot = {
  type: 'VISIT_COUNT'
  threshold: number
  rewardDescription: string
}

export type PurchaseItem = {
  id: string
  name: string
  description?: string
  quantity: number
  unitPriceLuna: number
  lineTotalLuna: number
}

export type Purchase = {
  id: string
  chainReference: ChainReference
  merchantId: string
  merchantWalletSnapshot: string
  expectedAmountLuna: number
  currency: 'NIM'
  rewardRuleSnapshot: RewardRuleSnapshot
  warrantyNote?: string
  returnNote?: string
  status: PurchaseStatus
  txHash?: string
  buyerWallet?: string
  txBlockHeight?: number
  txTimestamp?: Date
  paymentDetectedAt?: Date
  finalizedAt?: Date
  createdAt: Date
  expiresAt: Date
  items: PurchaseItem[]
}

export type CreatePurchaseInput = Omit<
  Purchase,
  | 'currency'
  | 'status'
  | 'txHash'
  | 'buyerWallet'
  | 'txBlockHeight'
  | 'txTimestamp'
  | 'paymentDetectedAt'
  | 'finalizedAt'
>

export type VerificationAttempt = {
  id: string
  purchaseId: string
  txHash: string
  outcome: string
  detail?: string
  retryable: boolean
  createdAt: Date
}
