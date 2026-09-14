export const PURCHASE_STATUSES = [
  'DRAFT',
  'PAYMENT_PENDING',
  'PAYMENT_SUBMITTED',
  'PAYMENT_DETECTED',
  'VERIFIED',
  'ACTIVE',
  'EXPIRED',
  'PAYMENT_MISMATCH',
  'PAYMENT_FAILED',
  'CANCELLED',
] as const

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number]

const ALLOWED_TRANSITIONS: Readonly<Record<PurchaseStatus, readonly PurchaseStatus[]>> = {
  DRAFT: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAYMENT_SUBMITTED', 'EXPIRED', 'CANCELLED'],
  PAYMENT_SUBMITTED: ['PAYMENT_DETECTED', 'PAYMENT_MISMATCH', 'PAYMENT_FAILED', 'EXPIRED'],
  PAYMENT_DETECTED: ['VERIFIED', 'PAYMENT_FAILED'],
  VERIFIED: ['ACTIVE'],
  ACTIVE: [],
  EXPIRED: [],
  PAYMENT_MISMATCH: [],
  PAYMENT_FAILED: [],
  CANCELLED: [],
}

export function canTransitionPurchase(from: PurchaseStatus, to: PurchaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function assertPurchaseTransition(from: PurchaseStatus, to: PurchaseStatus): void {
  if (!canTransitionPurchase(from, to)) {
    throw new Error(`Purchase cannot transition from ${from} to ${to}.`)
  }
}

export function isVerifiedPurchase(status: PurchaseStatus): boolean {
  return status === 'VERIFIED' || status === 'ACTIVE'
}
