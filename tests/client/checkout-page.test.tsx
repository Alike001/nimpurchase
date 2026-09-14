import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(), submit: vi.fn(), verify: vi.fn(), send: vi.fn(), provider: vi.fn(),
}))
vi.mock('../../src/client/lib/api', () => ({ purchaseApi: { get: mocks.get, submit: mocks.submit, verify: mocks.verify, history: vi.fn() } }))
vi.mock('../../src/client/lib/nimiq-provider', () => ({
  getNimiqProvider: mocks.provider,
  isProviderError: (value: unknown) => typeof value === 'object' && value !== null && 'error' in value,
  userFacingWalletError: (error: unknown) => error instanceof Error ? error.message : 'Payment was cancelled in Nimiq Pay.',
}))
import { CheckoutPage } from '../../src/client/features/checkout/CheckoutPage'

const purchase = (status = 'PAYMENT_PENDING') => ({ id: 'purchase-1', merchantName: 'Ada Coffee', merchantWallet: 'NQ MERCHANT', itemSummary: 'Coffee', expectedAmountLuna: 200_000, chainReference: 'np:v1:01ARZ3NDEKTSV4RRFFQ69G5FAV', status, expiresAt: new Date(Date.now() + 60_000).toISOString(), reward: { current: 0, threshold: 5, description: 'Free coffee' } })
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers() })
beforeEach(() => { mocks.verify.mockResolvedValue({ status: 'PAYMENT_SUBMITTED' }) })

describe('Nimiq checkout', () => {
  it('renders the server-defined item and amount', async () => { mocks.get.mockResolvedValue(purchase()); render(<CheckoutPage purchaseId="purchase-1" />); expect(await screen.findByText('Coffee')).toBeTruthy(); expect(screen.getByText('2 NIM')).toBeTruthy() })
  it('does not submit when wallet confirmation is rejected', async () => { mocks.get.mockResolvedValue(purchase()); mocks.provider.mockResolvedValue({ sendBasicTransactionWithData: mocks.send.mockRejectedValue(new Error('Payment was cancelled in Nimiq Pay.')) }); render(<CheckoutPage purchaseId="purchase-1" />); fireEvent.click(await screen.findByRole('button', { name: 'Pay with NIM' })); await screen.findByRole('alert'); expect(mocks.submit).not.toHaveBeenCalled() })
  it('submits only the wallet-returned transaction hash', async () => { mocks.get.mockResolvedValue(purchase()); mocks.send.mockResolvedValue('tx-hash'); mocks.provider.mockResolvedValue({ sendBasicTransactionWithData: mocks.send }); mocks.submit.mockResolvedValue({ status: 'PAYMENT_SUBMITTED' }); render(<CheckoutPage purchaseId="purchase-1" />); fireEvent.click(await screen.findByRole('button', { name: 'Pay with NIM' })); await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith('purchase-1', 'tx-hash')); expect(mocks.send).toHaveBeenCalledWith({ recipient: 'NQ MERCHANT', value: 200_000, data: purchase().chainReference }) })
  it.each([['PAYMENT_SUBMITTED', 'Payment sent. Waiting for confirmation...'], ['PAYMENT_DETECTED', 'Payment detected. Securing purchase...'], ['ACTIVE', 'Purchase verified']])('renders %s in human language', async (status, copy) => { mocks.get.mockResolvedValue(purchase(status)); render(<CheckoutPage purchaseId="purchase-1" />); expect(await screen.findByText(copy)).toBeTruthy() })
  it('keeps a temporary verification failure recoverable without exposing an RPC error', async () => { vi.useFakeTimers(); mocks.get.mockResolvedValue(purchase('PAYMENT_SUBMITTED')); mocks.verify.mockRejectedValue(new Error('RPC unavailable')); render(<CheckoutPage purchaseId="purchase-1" />); await act(async () => { await Promise.resolve(); await vi.advanceTimersByTimeAsync(3_000) }); expect(screen.getByRole('alert').textContent).toContain('Your payment hasn’t been lost.') })
  it('resumes verification after refresh from persisted submitted state', async () => { vi.useFakeTimers(); mocks.get.mockResolvedValue(purchase('PAYMENT_SUBMITTED')); mocks.verify.mockResolvedValue({ status: 'ACTIVE' }); render(<CheckoutPage purchaseId="purchase-1" />); await act(async () => { await Promise.resolve(); await vi.advanceTimersByTimeAsync(3_000) }); expect(mocks.verify).toHaveBeenCalledWith('purchase-1', undefined) })
  it('prevents payment for an expired checkout', async () => { mocks.get.mockResolvedValue(purchase('EXPIRED')); render(<CheckoutPage purchaseId="purchase-1" />); expect(await screen.findByText(/expired/)).toBeTruthy(); expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true) })
})
