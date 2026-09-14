import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ provider: vi.fn() }))
vi.mock('../../src/client/lib/nimiq-provider', () => ({
  getNimiqProvider: mocks.provider,
  isProviderError: (value: unknown) => typeof value === 'object' && value !== null && 'error' in value,
}))
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <svg aria-label="Checkout QR code" /> }))
import { MerchantPage } from '../../src/client/features/merchant/MerchantPage'

afterEach(() => { cleanup(); window.localStorage.clear(); vi.clearAllMocks() })

describe('merchant onboarding', () => {
  it('prefers the Nimiq Pay account list over manual address entry', async () => {
    mocks.provider.mockResolvedValue({ listAccounts: vi.fn().mockResolvedValue(['NQ12 CURRENT ACCOUNT']) })
    render(<MerchantPage />)
    expect(await screen.findByRole('option', { name: 'NQ12 CURRENT ACCOUNT' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Use this account' })).toBeTruthy()
  })
})
