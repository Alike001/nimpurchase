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

export type NimiqSignatureVerification = 'VALID' | 'ADDRESS_MISMATCH' | 'SIGNATURE_INVALID' | 'MALFORMED'

export function isMerchantAuthChallengeUsable(challenge: MerchantAuthChallenge, now = new Date()): boolean {
  return !challenge.usedAt && challenge.expiresAt.getTime() > now.getTime()
}

export function normalizeNimiqAddress(address: string): string {
  return address.replace(/\s+/g, '').toUpperCase()
}

export function canonicalizeNimiqAddress(address: string): string {
  return Address.fromAny(address).toUserFriendlyAddress()
}

export function inspectNimiqSignedMessage(input: {
  message: string
  publicKeyHex: string
  signatureHex: string
  expectedAddress: string
}): NimiqSignatureVerification {
  try {
    const publicKey = PublicKey.fromHex(input.publicKeyHex)
    const signature = Signature.fromHex(input.signatureHex)
    const derivedAddress = publicKey.toAddress().toUserFriendlyAddress()

    if (normalizeNimiqAddress(derivedAddress) !== normalizeNimiqAddress(input.expectedAddress)) return 'ADDRESS_MISMATCH'

    const messageBytes = BufferUtils.fromUtf8(input.message)
    const valid = NIMIQ_SIGNED_MESSAGE_PREFIXES.some((prefix) => {
      const signedPayload = BufferUtils.fromUtf8(`${prefix}${messageBytes.byteLength}${input.message}`)
      return publicKey.verify(signature, Hash.computeSha256(signedPayload))
    })
    return valid ? 'VALID' : 'SIGNATURE_INVALID'
  } catch {
    return 'MALFORMED'
  }
}

export function verifyNimiqSignedMessage(input: Parameters<typeof inspectNimiqSignedMessage>[0]): boolean {
  return inspectNimiqSignedMessage(input) === 'VALID'
}
