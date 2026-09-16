import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/client/features/purchases/HistoryPage', () => ({
  HistoryPage: () => <main>Customer Purchase Passports</main>,
}))

import { App } from '../../src/client/app/App'

afterEach(() => {
  cleanup()
  delete window.nimiq
  delete window.nimiqPay
  window.history.replaceState({}, '', '/')
})

describe('application entry routing', () => {
  it('shows the public product story outside Nimiq Pay', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Pay once. You’re already a regular.' })).toBeTruthy()
  })

  it('opens the customer product home immediately inside Nimiq Pay', () => {
    window.nimiqPay = { requestDeviceIdentifier: vi.fn() }
    render(<App />)
    expect(screen.getByText('Customer Purchase Passports')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Pay once. You’re already a regular.' })).toBeNull()
  })
})
