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

export function normalizeTransaction(value: unknown): NormalizedNimiqTransaction {
  if (!value || typeof value !== 'object') throw new Error('Nimiq RPC returned an invalid transaction payload.')
  const transaction = value as RpcTransaction
  const valueLuna = optionalNumber(transaction.value)
  if (valueLuna === undefined) throw new Error('Nimiq RPC transaction is missing value.')
  const network = (transaction.network ?? transaction.networkId) as NimiqNetwork
  if (typeof network !== 'string' && typeof network !== 'number') throw new Error('Nimiq RPC transaction is missing network.')
  const timestamp = optionalNumber(transaction.timestamp)
  return {
    hash: requiredString(transaction.hash ?? transaction.transactionHash, 'hash'),
    sender: requiredString(transaction.from ?? transaction.sender, 'sender'),
    recipient: requiredString(transaction.to ?? transaction.recipient, 'recipient'),
    valueLuna,
    dataText: typeof (transaction.recipientData ?? transaction.data) === 'string'
      ? (transaction.recipientData ?? transaction.data) as string : undefined,
    network,
    valid: typeof transaction.valid === 'boolean' ? transaction.valid : undefined,
    executionResult: typeof transaction.executionResult === 'boolean' ? transaction.executionResult : undefined,
    blockHeight: optionalNumber(transaction.blockNumber ?? transaction.blockHeight),
    timestamp: timestamp === undefined ? undefined : new Date(timestamp),
  }
}
