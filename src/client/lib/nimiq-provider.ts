import { init, type NimiqProvider } from '@nimiq/mini-app-sdk'

let providerPromise: Promise<NimiqProvider> | undefined

export function getNimiqProvider(): Promise<NimiqProvider> {
  providerPromise ??= init()
  return providerPromise
}

export function isProviderError(value: unknown): value is { error: { message: string } } {
  return typeof value === 'object' && value !== null && 'error' in value
}

export function userFacingWalletError(error: unknown): string {
  if (isProviderError(error)) return error.error.message
  if (error instanceof Error && /denied|reject/i.test(error.message)) return 'Payment was cancelled in Nimiq Pay.'
  return 'Nimiq Pay could not complete the payment request. Please try again.'
}
