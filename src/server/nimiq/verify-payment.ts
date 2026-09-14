import { decodeChainReference } from '../../shared/chain-reference'
import type { NimiqChainAdapter, PaymentExpectation, PaymentValidation } from './types'

export async function verifyNimiqPayment(adapter: NimiqChainAdapter, expected: PaymentExpectation): Promise<PaymentValidation> {
  const transaction = await adapter.getTransactionByHash(expected.txHash)
  if (!transaction) return { kind: 'RETRYABLE_NOT_FOUND' }
  if (transaction.hash !== expected.txHash) return { kind: 'MISMATCH', reason: 'HASH' }
  if (transaction.recipient !== expected.merchantWallet) return { kind: 'MISMATCH', reason: 'RECIPIENT' }
  if (transaction.valueLuna !== expected.expectedAmountLuna) return { kind: 'MISMATCH', reason: 'AMOUNT' }
  if (String(transaction.network) !== String(expected.network)) return { kind: 'MISMATCH', reason: 'NETWORK' }
  try {
    if (decodeChainReference(transaction.dataText) !== expected.chainReference) return { kind: 'MISMATCH', reason: 'REFERENCE' }
  } catch { return { kind: 'MISMATCH', reason: 'REFERENCE' } }
  if (transaction.valid === false) return { kind: 'MISMATCH', reason: 'INVALID' }
  if (transaction.executionResult === false) return { kind: 'MISMATCH', reason: 'EXECUTION_FAILED' }
  if (transaction.blockHeight === undefined) return { kind: 'MISMATCH', reason: 'NOT_INCLUDED' }
  return { kind: 'DETECTED', transaction }
}
