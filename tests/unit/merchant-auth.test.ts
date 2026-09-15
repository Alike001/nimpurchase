import { BufferUtils, Hash, KeyPair } from '@nimiq/core'
import { describe, expect, it } from 'vitest'
import { isMerchantAuthChallengeUsable, normalizeNimiqAddress, verifyNimiqSignedMessage } from '../../src/server/auth/nimiq-signature'
import { createSessionToken, hashSessionToken, merchantSessionCookie, readCookie, sessionCookie } from '../../src/server/auth/session'

const prefix = '\x16Nimiq Signed Message:\n'

function signedFixture(message: string) {
  const keyPair = KeyPair.generate()
  const messageBytes = BufferUtils.fromUtf8(message)
  const payload = BufferUtils.fromUtf8(`${prefix}${messageBytes.byteLength}${message}`)
  const hash = Hash.computeSha256(payload)
  return {
    expectedAddress: keyPair.toAddress().toUserFriendlyAddress(),
    publicKeyHex: keyPair.publicKey.toHex(),
    signatureHex: keyPair.sign(hash).toHex(),
  }
}

describe('merchant wallet authentication', () => {
  it('verifies a signed Nimiq message and its derived address', () => {
    const message = 'Sign in to NimPurchase\nRequest: test'
    expect(verifyNimiqSignedMessage({ message, ...signedFixture(message) })).toBe(true)
  })

  it('rejects a signature for a different message', () => {
    const signed = signedFixture('original')
    expect(verifyNimiqSignedMessage({ message: 'changed', ...signed })).toBe(false)
  })

  it('rejects a public key that derives to another wallet', () => {
    const message = 'Sign in to NimPurchase'
    const signed = signedFixture(message)
    const otherAddress = KeyPair.generate().toAddress().toUserFriendlyAddress()
    expect(verifyNimiqSignedMessage({ message, ...signed, expectedAddress: otherAddress })).toBe(false)
  })

  it('normalizes user-friendly address spacing and case', () => {
    expect(normalizeNimiqAddress('nq12 abcd efgh')).toBe('NQ12ABCDEFGH')
  })

  it('rejects an expired challenge', () => {
    expect(isMerchantAuthChallengeUsable({ expiresAt: new Date('2026-09-15T10:00:00Z') }, new Date('2026-09-15T10:00:01Z'))).toBe(false)
  })

  it('rejects a challenge that was already used', () => {
    expect(isMerchantAuthChallengeUsable({
      expiresAt: new Date('2026-09-15T10:05:00Z'),
      usedAt: new Date('2026-09-15T10:00:00Z'),
    }, new Date('2026-09-15T10:01:00Z'))).toBe(false)
  })

  it('creates opaque hashed sessions and reads their cookie', () => {
    const token = createSessionToken()
    expect(token.length).toBeGreaterThanOrEqual(40)
    expect(hashSessionToken(token)).not.toContain(token)
    const cookie = sessionCookie(token, true)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(readCookie(`${merchantSessionCookie}=${token}; other=value`, merchantSessionCookie)).toBe(token)
  })
})
