import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ provider: vi.fn() }))
vi.mock('../../src/client/lib/nimiq-provider', () => ({
  getNimiqProvider: mocks.provider,
  isProviderError: (value: unknown) => typeof value === 'object' && value !== null && 'error' in value,
  userFacingSigningError: () => 'Account confirmation cancelled. Nothing was changed.',
}))
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <svg aria-label="Checkout QR code" /> }))
import { MerchantPage } from '../../src/client/features/merchant/MerchantPage'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('merchant onboarding', () => {
  it('prefers the Nimiq Pay account list over manual address entry', async () => {
    mocks.provider.mockResolvedValue({ listAccounts: vi.fn().mockResolvedValue(['NQ12 CURRENT ACCOUNT']) })
    render(<MerchantPage />)
    expect(await screen.findByRole('option', { name: 'NQ12 CURRENT ACCOUNT' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm with Nimiq Pay' })).toBeTruthy()
  })

  it('signs the server challenge and sends only the wallet proof to verification', async () => {
    const sign = vi.fn().mockResolvedValue({ publicKey: 'public-key', signature: 'signature' })
    mocks.provider.mockResolvedValue({
      listAccounts: vi.fn().mockResolvedValue(['NQ12 CURRENT ACCOUNT']),
      sign,
    })
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/merchant-auth/challenge') return response({ challengeId: 'challenge-1', message: 'Confirm this account', expiresAt: new Date().toISOString() }, 201)
      if (url === '/api/merchant-auth/verify') return response({ id: 'merchant-1', displayName: 'Alike Coffee', walletAddress: 'NQ12 CURRENT ACCOUNT' })
      if (url === '/api/merchant-auth/session') return response({ id: 'merchant-1', displayName: 'Alike Coffee', walletAddress: 'NQ12 CURRENT ACCOUNT' })
      if (url.endsWith('/purchases') || url.endsWith('/support')) return response([])
      throw new Error(`Unexpected request: ${url} ${init?.method ?? 'GET'}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<MerchantPage />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Business name' }), { target: { value: 'Alike Coffee' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm with Nimiq Pay' }))

    await waitFor(() => expect(sign).toHaveBeenCalledWith('Confirm this account'))
    await waitFor(() => expect(window.localStorage.getItem('nimpurchase:merchant-id')).toBe('merchant-1'))
    const verificationCall = fetchMock.mock.calls.find(([url]) => String(url) === '/api/merchant-auth/verify')
    expect(JSON.parse(String(verificationCall?.[1]?.body))).toEqual({
      challengeId: 'challenge-1',
      publicKey: 'public-key',
      signature: 'signature',
    })
  })

  it('does not verify or open a workspace when account confirmation is rejected', async () => {
    mocks.provider.mockResolvedValue({
      listAccounts: vi.fn().mockResolvedValue(['NQ12 CURRENT ACCOUNT']),
      sign: vi.fn().mockResolvedValue({ error: { message: 'User rejected request' } }),
    })
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/merchant-auth/challenge') return response({ challengeId: 'challenge-1', message: 'Confirm this account', expiresAt: new Date().toISOString() }, 201)
      throw new Error(`Unexpected request: ${String(input)}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<MerchantPage />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Business name' }), { target: { value: 'Alike Coffee' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm with Nimiq Pay' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Account confirmation cancelled')
    expect(fetchMock).not.toHaveBeenCalledWith('/api/merchant-auth/verify', expect.anything())
    expect(window.localStorage.getItem('nimpurchase:merchant-id')).toBeNull()
  })

  it('restores the merchant identity for an empty authenticated workspace', async () => {
    window.localStorage.setItem('nimpurchase:merchant-id', 'merchant-1')
    mocks.provider.mockResolvedValue({ listAccounts: vi.fn() })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/merchant-auth/session') return response({ id: 'merchant-1', displayName: 'Alike Coffee', walletAddress: 'NQ15 LONG MERCHANT ADDRESS C5GF' })
      if (url.endsWith('/purchases') || url.endsWith('/support')) return response([])
      throw new Error(`Unexpected request: ${url}`)
    }))

    render(<MerchantPage />)

    expect(await screen.findByRole('heading', { name: 'Hello, Alike Coffee.' })).toBeTruthy()
    expect(screen.getByText(/Receiving to/).textContent).toContain('NQ15 LONG…C5GF')
  })
})
