import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  provider: vi.fn(),
  supportChallenge: vi.fn(),
  sendSupport: vi.fn(),
}))

vi.mock('../../src/client/lib/nimiq-provider', () => ({
  getNimiqProvider: mocks.provider,
  isProviderError: (value: unknown) => typeof value === 'object' && value !== null && 'error' in value,
  userFacingSigningError: () => 'Support confirmation cancelled. Nothing was sent.',
}))

vi.mock('../../src/client/lib/api', () => ({
  purchaseApi: {
    supportChallenge: mocks.supportChallenge,
    sendSupport: mocks.sendSupport,
  },
}))

import { PurchaseCard } from '../../src/client/features/purchases/PurchaseCard'

const purchase = {
  id: 'purchase-1',
  merchantName: 'Alike Coffee',
  merchantWallet: 'NQ15 TEST',
  itemSummary: 'Flat white',
  expectedAmountLuna: 150_000,
  chainReference: 'np:v1:01ARZ3NDEKTSV4RRFFQ69G5FAV',
  status: 'ACTIVE',
  expiresAt: '2026-09-17T10:00:00.000Z',
  purchasedAt: '2026-09-17T09:00:00.000Z',
  reward: { current: 1, threshold: 5, description: 'Free coffee' },
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Purchase Passport support', () => {
  it('signs the server-issued support challenge before sending the message', async () => {
    const sign = vi.fn().mockResolvedValue({ publicKey: 'buyer-public-key', signature: 'buyer-signature' })
    mocks.provider.mockResolvedValue({ sign })
    mocks.supportChallenge.mockResolvedValue({ challengeId: 'support-challenge-1', message: 'Confirm support request', expiresAt: '2026-09-17T10:05:00.000Z' })
    mocks.sendSupport.mockResolvedValue({ id: 'support-1', status: 'OPEN' })
    render(<PurchaseCard purchase={purchase} />)

    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please help with this purchase.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Get support' }))

    await waitFor(() => expect(sign).toHaveBeenCalledWith('Confirm support request'))
    await waitFor(() => expect(mocks.sendSupport).toHaveBeenCalledWith('purchase-1', {
      challengeId: 'support-challenge-1',
      publicKey: 'buyer-public-key',
      signature: 'buyer-signature',
      message: 'Please help with this purchase.',
    }))
    expect((await screen.findByRole('status')).textContent).toContain('Support request sent to the merchant.')
  })

  it('does not send support when the wallet confirmation is cancelled', async () => {
    mocks.provider.mockResolvedValue({ sign: vi.fn().mockResolvedValue({ error: { message: 'User rejected request' } }) })
    mocks.supportChallenge.mockResolvedValue({ challengeId: 'support-challenge-1', message: 'Confirm support request', expiresAt: '2026-09-17T10:05:00.000Z' })
    render(<PurchaseCard purchase={purchase} />)

    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please help with this purchase.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Get support' }))

    expect((await screen.findByRole('status')).textContent).toContain('Support confirmation cancelled')
    expect(mocks.sendSupport).not.toHaveBeenCalled()
  })
})
