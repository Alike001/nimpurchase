import { describe, expect, it } from 'vitest'
import {
  CHAIN_REFERENCE_PREFIX,
  ChainReferenceError,
  MAX_TRANSACTION_DATA_BYTES,
  decodeChainReference,
  encodeChainReference,
} from '../../src/shared/chain-reference'

const opaqueId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'

describe('chain reference codec', () => {
  it('encodes and decodes a compact versioned opaque reference', () => {
    const reference = encodeChainReference(opaqueId)

    expect(reference).toBe(`${CHAIN_REFERENCE_PREFIX}${opaqueId}`)
    expect(decodeChainReference(reference)).toBe(reference)
    expect(new TextEncoder().encode(reference).byteLength).toBeLessThanOrEqual(MAX_TRANSACTION_DATA_BYTES)
  })

  it.each([
    'np:v2:01ARZ3NDEKTSV4RRFFQ69G5FAV',
    'np:v1:not-a-ulid',
    '01JABCDEFGHJKMNPQRSTVWXYZ',
    '',
  ])('rejects malformed or unsupported references: %s', (value) => {
    expect(() => decodeChainReference(value)).toThrow(ChainReferenceError)
  })
})
