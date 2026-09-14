export const CHAIN_REFERENCE_PREFIX = 'np:v1:'
export const MAX_TRANSACTION_DATA_BYTES = 64

const OPAQUE_ID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/

export type ChainReference = `${typeof CHAIN_REFERENCE_PREFIX}${string}`

export class ChainReferenceError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'ChainReferenceError'
  }
}

export function encodeChainReference(opaqueId: string): ChainReference {
  if (!OPAQUE_ID_PATTERN.test(opaqueId)) {
    throw new ChainReferenceError('Purchase reference identifiers must be 26-character uppercase ULIDs.')
  }

  const reference = `${CHAIN_REFERENCE_PREFIX}${opaqueId}` as ChainReference

  if (new TextEncoder().encode(reference).byteLength > MAX_TRANSACTION_DATA_BYTES) {
    throw new ChainReferenceError('Purchase reference exceeds Nimiq transaction-data limit.')
  }

  return reference
}

export function decodeChainReference(value: string | undefined | null): ChainReference {
  if (typeof value !== 'string' || !value.startsWith(CHAIN_REFERENCE_PREFIX)) {
    throw new ChainReferenceError('Purchase reference has an unsupported prefix or version.')
  }

  const opaqueId = value.slice(CHAIN_REFERENCE_PREFIX.length)
  const canonicalReference = encodeChainReference(opaqueId)

  if (value !== canonicalReference) {
    throw new ChainReferenceError('Purchase reference is not canonical.')
  }

  return canonicalReference
}
