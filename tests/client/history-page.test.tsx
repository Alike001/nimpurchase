import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn(), history: vi.fn(), provider: vi.fn() }))
vi.mock('../../src/client/lib/api', () => ({ purchaseApi: { get: mocks.get, history: mocks.history } }))
vi.mock('../../src/client/lib/nimiq-provider', () => ({ getNimiqProvider: mocks.provider, isProviderError: (value: unknown) => typeof value === 'object' && value !== null && 'error' in value }))
import { HistoryPage } from '../../src/client/features/purchases/HistoryPage'

const passport = { id: 'passport-1', merchantName: 'Alike', merchantWallet: 'NQ MERCHANT', itemSummary: 'Biscuit', expectedAmountLuna: 100_000, chainReference: 'np:v1:reference', status: 'ACTIVE', expiresAt: '2026-09-18T00:00:00.000Z', reward: { current: 1, threshold: 5, description: 'Free biscuit' } }

beforeEach(() => { window.localStorage.clear(); vi.clearAllMocks() })
afterEach(cleanup)

describe('customer Passport recovery', () => {
  it('shows an active Passport previously opened on this device when the provider is unavailable', async () => {
    window.localStorage.setItem('nimpurchase:recent-passports', JSON.stringify(['passport-1']))
    mocks.get.mockResolvedValue(passport)
    mocks.provider.mockRejectedValue(new Error('Provider unavailable'))
    render(<HistoryPage />)
    expect(await screen.findByText('Biscuit')).toBeTruthy()
    expect(screen.getByText(/Passports opened on this device are still here/)).toBeTruthy()
  })
})
