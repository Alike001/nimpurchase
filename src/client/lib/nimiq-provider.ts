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
  if (error instanceof Error && /denied|reject|cancel/i.test(error.message)) return 'Payment cancelled. You can try again whenever you’re ready.'
  return 'Nimiq Pay could not complete the payment request. Please try again.'
}

export function userFacingSigningError(error: unknown): string {
  if (isProviderError(error)) {
    if (/denied|reject|cancel/i.test(error.error.message)) return 'Account confirmation cancelled. Nothing was changed.'
    return 'Nimiq Pay could not confirm this account. Please try again.'
  }
  if (error instanceof Error && /denied|reject|cancel/i.test(error.message)) {
    return 'Account confirmation cancelled. Nothing was changed.'
  }
  return 'Nimiq Pay could not confirm this account. Please try again.'
}
