import { Address, BufferUtils, Hash, PublicKey, Signature } from '@nimiq/core'

// Nimiq's current Hub guide shows the spaced form in its verification example,
// while older clients use the compact form. Both are domain-separated Nimiq
// message encodings; accepting both keeps wallet-auth compatible across hosts.
const NIMIQ_SIGNED_MESSAGE_PREFIXES = [
  '\x16Nimiq Signed Message:\n',
  '\x16 Nimiq Signed Message:\n',
] as const

export type MerchantAuthChallenge = {
  expiresAt: Date
  usedAt?: Date | null
}

export function isMerchantAuthChallengeUsable(challenge: MerchantAuthChallenge, now = new Date()): boolean {
  return !challenge.usedAt && challenge.expiresAt.getTime() > now.getTime()
}

export function normalizeNimiqAddress(address: string): string {
  return address.replace(/\s+/g, '').toUpperCase()
}

export function canonicalizeNimiqAddress(address: string): string {
  return Address.fromAny(address).toUserFriendlyAddress()
}

export function verifyNimiqSignedMessage(input: {
  message: string
  publicKeyHex: string
  signatureHex: string
  expectedAddress: string
}): boolean {
  try {
    const publicKey = PublicKey.fromHex(input.publicKeyHex)
    const signature = Signature.fromHex(input.signatureHex)
    const derivedAddress = publicKey.toAddress().toUserFriendlyAddress()

    if (normalizeNimiqAddress(derivedAddress) !== normalizeNimiqAddress(input.expectedAddress)) return false

    const messageBytes = BufferUtils.fromUtf8(input.message)
    return NIMIQ_SIGNED_MESSAGE_PREFIXES.some((prefix) => {
      const signedPayload = BufferUtils.fromUtf8(`${prefix}${messageBytes.byteLength}${input.message}`)
      return publicKey.verify(signature, Hash.computeSha256(signedPayload))
    })
  } catch {
    return false
  }
}
