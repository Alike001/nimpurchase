import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendSupport: vi.fn(),
}))

vi.mock('../../src/client/lib/api', () => ({
  purchaseApi: {
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
  it('sends a support message from an active Purchase Passport', async () => {
    mocks.sendSupport.mockResolvedValue({ id: 'support-1', status: 'OPEN' })
    render(<PurchaseCard purchase={purchase} />)

    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please help with this purchase.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Get support' }))

    await waitFor(() => expect(mocks.sendSupport).toHaveBeenCalledWith('purchase-1', 'Please help with this purchase.'))
    expect((await screen.findByRole('status')).textContent).toContain('Support request sent to the merchant.')
  })

  it('keeps a temporary support failure recoverable', async () => {
    mocks.sendSupport.mockRejectedValue(new Error('Temporary server problem'))
    render(<PurchaseCard purchase={purchase} />)

    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please help with this purchase.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Get support' }))

    expect((await screen.findByRole('status')).textContent).toContain('We could not send your request. Please try again.')
  })

  it('explains when a Passport reaches the support submission rate limit', async () => {
    mocks.sendSupport.mockRejectedValue(new Error('Too many support requests. Please wait a few minutes.'))
    render(<PurchaseCard purchase={purchase} />)

    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please help with this purchase.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Get support' }))

    expect((await screen.findByRole('status')).textContent).toContain('Please wait a few minutes')
  })
})
