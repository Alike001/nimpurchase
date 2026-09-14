import { describe, expect, it } from 'vitest'
import { encodeChainReference } from '../../src/shared/chain-reference'
import { InMemoryPurchaseRepository } from '../../src/server/purchases/in-memory-repository'
import { createPurchase } from '../../src/server/purchases/service'
import { verifyPurchasePayment } from '../../src/server/purchases/verification-service'
import type { NimiqChainAdapter, NormalizedNimiqTransaction } from '../../src/server/nimiq/types'

const reference = encodeChainReference('01ARZ3NDEKTSV4RRFFQ69G5FAV')
const merchantWallet = 'NQ12 MERCHANT WALLET SNAPSHOT'
const buyerWallet = 'NQ34 BUYER WALLET'
const txHash = 'transaction-hash-1'

class FakeChainAdapter implements NimiqChainAdapter {
  public transaction: NormalizedNimiqTransaction | undefined = {
    hash: txHash, sender: buyerWallet, recipient: merchantWallet, valueLuna: 200_000, dataText: reference,
    network: 'TestAlbatross', valid: true, executionResult: true, blockHeight: 123, timestamp: new Date(0),
  }
  public finalized = false
  public async getTransactionByHash(): Promise<NormalizedNimiqTransaction | undefined> { return this.transaction }
  public async isTransactionFinalized(): Promise<boolean> { return this.finalized }
}

async function setupPurchase(repository = new InMemoryPurchaseRepository()) {
  await createPurchase(repository, {
    id: 'purchase-1', chainReference: reference, merchantId: 'merchant-1', merchantWalletSnapshot: merchantWallet,
    expectedAmountLuna: 200_000, rewardRuleSnapshot: { type: 'VISIT_COUNT', threshold: 5, rewardDescription: 'Free coffee' },
    createdAt: new Date(0), expiresAt: new Date(60_000), items: [{ id: 'item-1', name: 'Coffee', quantity: 1, unitPriceLuna: 200_000, lineTotalLuna: 200_000 }],
  })
  return repository
}

async function verify(repository: InMemoryPurchaseRepository, adapter: FakeChainAdapter, hash = txHash) {
  return verifyPurchasePayment({ repository, adapter, purchaseId: 'purchase-1', txHash: hash, network: 'TestAlbatross' })
}

describe('purchase verification lifecycle', () => {
  it('detects a valid included transaction and records its on-chain buyer', async () => {
    const repository = await setupPurchase(); const adapter = new FakeChainAdapter()
    await expect(verify(repository, adapter)).resolves.toBe('DETECTED')
    await expect(repository.findById('purchase-1')).resolves.toMatchObject({ status: 'PAYMENT_DETECTED', buyerWallet, txBlockHeight: 123 })
  })

  it('keeps a missing transaction retryable', async () => {
    const repository = await setupPurchase(); const adapter = new FakeChainAdapter(); adapter.transaction = undefined
    await expect(verify(repository, adapter)).resolves.toBe('RETRYABLE_NOT_FOUND')
    await expect(repository.listVerificationAttempts('purchase-1')).resolves.toMatchObject([{ retryable: true, outcome: 'RETRYABLE_NOT_FOUND' }])
  })

  it.each([
    ['recipient', (transaction: NormalizedNimiqTransaction) => ({ ...transaction, recipient: 'NQ99 WRONG' })],
    ['amount', (transaction: NormalizedNimiqTransaction) => ({ ...transaction, valueLuna: 1 })],
    ['reference', (transaction: NormalizedNimiqTransaction) => ({ ...transaction, dataText: encodeChainReference('01BX5ZZKBKACTAV9WEVGEMMVS0') })],
    ['network', (transaction: NormalizedNimiqTransaction) => ({ ...transaction, network: 'MainAlbatross' })],
    ['invalid transaction', (transaction: NormalizedNimiqTransaction) => ({ ...transaction, valid: false })],
    ['failed execution', (transaction: NormalizedNimiqTransaction) => ({ ...transaction, executionResult: false })],
  ])('rejects a wrong %s', async (_label, mutate) => {
    const repository = await setupPurchase(); const adapter = new FakeChainAdapter()
    adapter.transaction = mutate(adapter.transaction!)
    await expect(verify(repository, adapter)).resolves.toBe('MISMATCH')
    await expect(repository.findById('purchase-1')).resolves.toMatchObject({ status: 'PAYMENT_MISMATCH' })
  })

  it('prevents one transaction hash activating another purchase', async () => {
    const repository = await setupPurchase(); const adapter = new FakeChainAdapter()
    await createPurchase(repository, {
      id: 'purchase-2', chainReference: encodeChainReference('01BX5ZZKBKACTAV9WEVGEMMVS0'), merchantId: 'merchant-1', merchantWalletSnapshot: merchantWallet,
      expectedAmountLuna: 200_000, rewardRuleSnapshot: { type: 'VISIT_COUNT', threshold: 5, rewardDescription: 'Free coffee' }, createdAt: new Date(0), expiresAt: new Date(60_000),
      items: [{ id: 'item-2', name: 'Coffee', quantity: 1, unitPriceLuna: 200_000, lineTotalLuna: 200_000 }],
    })
    await verify(repository, adapter)
    await expect(verifyPurchasePayment({ repository, adapter, purchaseId: 'purchase-2', txHash, network: 'TestAlbatross' })).rejects.toThrow('already assigned')
  })

  it('is idempotent and credits a finalized purchase once', async () => {
    const repository = await setupPurchase(); const adapter = new FakeChainAdapter(); adapter.finalized = true
    await expect(verify(repository, adapter)).resolves.toBe('FINALIZED')
    await expect(verify(repository, adapter)).resolves.toBe('FINALIZED')
    await expect(repository.findById('purchase-1')).resolves.toMatchObject({ status: 'ACTIVE', buyerWallet })
  })

  it('separates inclusion from macro finality', async () => {
    const repository = await setupPurchase(); const adapter = new FakeChainAdapter()
    await expect(verify(repository, adapter)).resolves.toBe('DETECTED')
    adapter.finalized = true
    await expect(verify(repository, adapter)).resolves.toBe('FINALIZED')
  })
})
