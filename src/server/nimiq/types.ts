export type NimiqNetwork = string | number

export type NormalizedNimiqTransaction = {
  hash: string
  sender: string
  recipient: string
  valueLuna: number
  dataText?: string
  network: NimiqNetwork
  valid?: boolean
  executionResult?: boolean
  blockHeight?: number
  timestamp?: Date
}

export type PaymentExpectation = {
  txHash: string
  merchantWallet: string
  expectedAmountLuna: number
  chainReference: string
  network: NimiqNetwork
}

export type PaymentValidation =
  | { kind: 'DETECTED'; transaction: NormalizedNimiqTransaction }
  | { kind: 'RETRYABLE_NOT_FOUND' }
  | { kind: 'MISMATCH'; reason: 'HASH' | 'RECIPIENT' | 'AMOUNT' | 'REFERENCE' | 'NETWORK' | 'INVALID' | 'EXECUTION_FAILED' | 'NOT_INCLUDED' }

export interface NimiqChainAdapter {
  getTransactionByHash(hash: string): Promise<NormalizedNimiqTransaction | undefined>
  isTransactionFinalized(inclusionHeight: number): Promise<boolean>
}
