import { describe, expect, it } from 'vitest'
import { assertPurchaseTransition, canTransitionPurchase, isVerifiedPurchase } from '../../src/shared/purchase-state'

describe('purchase state machine', () => {
  it('permits the verified payment lifecycle', () => {
    expect(canTransitionPurchase('PAYMENT_PENDING', 'PAYMENT_SUBMITTED')).toBe(true)
    expect(canTransitionPurchase('PAYMENT_SUBMITTED', 'PAYMENT_DETECTED')).toBe(true)
    expect(canTransitionPurchase('PAYMENT_DETECTED', 'ACTIVE')).toBe(true)
  })

  it('blocks skipping finality', () => {
    expect(canTransitionPurchase('PAYMENT_SUBMITTED', 'ACTIVE')).toBe(false)
    expect(() => assertPurchaseTransition('PAYMENT_SUBMITTED', 'ACTIVE')).toThrow(
      'Purchase cannot transition from PAYMENT_SUBMITTED to ACTIVE.',
    )
  })

  it('treats only verified or active purchases as eligible downstream', () => {
    expect(isVerifiedPurchase('PAYMENT_DETECTED')).toBe(false)
    expect(isVerifiedPurchase('ACTIVE')).toBe(true)
  })
})
