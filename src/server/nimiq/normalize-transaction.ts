import type { NimiqNetwork, NormalizedNimiqTransaction } from './types'

type RpcTransaction = {
  hash?: unknown
  transactionHash?: unknown
  from?: unknown
  sender?: unknown
  to?: unknown
  recipient?: unknown
  value?: unknown
  data?: unknown
  recipientData?: unknown
  network?: unknown
  networkId?: unknown
  valid?: unknown
  executionResult?: unknown
  blockNumber?: unknown
  blockHeight?: unknown
  timestamp?: unknown
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Nimiq RPC transaction is missing ${field}.`)
  return value
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isSafeInteger(parsed)) throw new Error('Nimiq RPC returned a non-integer numeric field.')
  return parsed
}

const NETWORK_NAMES: Record<number, NimiqNetwork> = {
  5: 'TestAlbatross',
  6: 'DevAlbatross',
  7: 'UnitAlbatross',
  24: 'MainAlbatross',
  42: 'Main',
}

function normalizeNetwork(value: unknown): NimiqNetwork {
  if (typeof value === 'string') return value
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('Nimiq RPC transaction is missing network.')
  }
  return NETWORK_NAMES[value] ?? value
}

function normalizeRecipientData(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return value
  const decoded = Buffer.from(value, 'hex').toString('utf8')
  return Buffer.from(decoded, 'utf8').toString('hex').toLowerCase() === value.toLowerCase() ? decoded : value
}

export function normalizeTransaction(value: unknown): NormalizedNimiqTransaction {
  if (!value || typeof value !== 'object') throw new Error('Nimiq RPC returned an invalid transaction payload.')
  const transaction = value as RpcTransaction
  const valueLuna = optionalNumber(transaction.value)
  if (valueLuna === undefined) throw new Error('Nimiq RPC transaction is missing value.')
  const network = normalizeNetwork(transaction.network ?? transaction.networkId)
  const timestamp = optionalNumber(transaction.timestamp)
  return {
    hash: requiredString(transaction.hash ?? transaction.transactionHash, 'hash'),
    sender: requiredString(transaction.from ?? transaction.sender, 'sender'),
    recipient: requiredString(transaction.to ?? transaction.recipient, 'recipient'),
    valueLuna,
    dataText: normalizeRecipientData(transaction.recipientData ?? transaction.data),
    network,
    valid: typeof transaction.valid === 'boolean' ? transaction.valid : undefined,
    executionResult: typeof transaction.executionResult === 'boolean' ? transaction.executionResult : undefined,
    blockHeight: optionalNumber(transaction.blockNumber ?? transaction.blockHeight),
    timestamp: timestamp === undefined ? undefined : new Date(timestamp),
  }
}
