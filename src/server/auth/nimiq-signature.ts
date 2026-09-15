import { Address, BufferUtils, Hash, PublicKey, Signature } from '@nimiq/core'

const NIMIQ_SIGNED_MESSAGE_PREFIX = '\x16Nimiq Signed Message:\n'

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
    const messageBytes = BufferUtils.fromUtf8(input.message)
    const signedPayload = BufferUtils.fromUtf8(`${NIMIQ_SIGNED_MESSAGE_PREFIX}${messageBytes.byteLength}${input.message}`)
    const hash = Hash.computeSha256(signedPayload)
    const derivedAddress = publicKey.toAddress().toUserFriendlyAddress()

    return normalizeNimiqAddress(derivedAddress) === normalizeNimiqAddress(input.expectedAddress)
      && publicKey.verify(signature, hash)
  } catch {
    return false
  }
}
