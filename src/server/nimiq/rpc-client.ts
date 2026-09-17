import { normalizeTransaction } from './normalize-transaction.js'
import type { NimiqChainAdapter, NormalizedNimiqTransaction } from './types'

type JsonRpcEnvelope = { result?: unknown; error?: { message?: string } }

function unwrapResult(envelope: JsonRpcEnvelope): unknown {
  if (envelope.error) throw new Error(envelope.error.message ?? 'Nimiq RPC request failed.')
  const result = envelope.result
  if (result && typeof result === 'object' && 'data' in result) return (result as { data: unknown }).data
  return result
}

export class NimiqJsonRpcAdapter implements NimiqChainAdapter {
  private nextRequestId = 1

  public constructor(private readonly endpoint: string, private readonly fetcher: typeof fetch = fetch) {}

  public async getTransactionByHash(hash: string): Promise<NormalizedNimiqTransaction | undefined> {
    const result = await this.call('getTransactionByHash', [hash])
    return result === null || result === undefined ? undefined : normalizeTransaction(result)
  }

  public async isTransactionFinalized(inclusionHeight: number): Promise<boolean> {
    // `getMacroBlockAfter` accepts a block height and returns the next macro-block
    // height. `getMacroBlockOf` has provider-specific batch semantics, so it must
    // not be used with an inclusion height.
    const closingMacroBlockHeight = await this.callNumber('getMacroBlockAfter', [inclusionHeight])
    const latestHeight = await this.getLatestBlockHeight()
    return latestHeight >= closingMacroBlockHeight
  }

  public async getLatestBlockHeight(): Promise<number> {
    const latestBlock = await this.call('getLatestBlock', [false])
    if (!latestBlock || typeof latestBlock !== 'object' || !('number' in latestBlock)) {
      throw new Error('Nimiq RPC returned an invalid latest-block payload.')
    }
    const latestHeight = Number((latestBlock as { number: unknown }).number)
    if (!Number.isSafeInteger(latestHeight)) throw new Error('Nimiq RPC returned an invalid latest block height.')
    return latestHeight
  }

  private async callNumber(method: string, params: unknown[]): Promise<number> {
    const result = await this.call(method, params)
    const value = Number(result)
    if (!Number.isSafeInteger(value)) throw new Error(`Nimiq RPC ${method} did not return a block height.`)
    return value
  }

  private async call(method: string, params: unknown[]): Promise<unknown> {
    const response = await this.fetcher(this.endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: this.nextRequestId++ }),
    })
    if (!response.ok) throw new Error(`Nimiq RPC responded with HTTP ${response.status}.`)
    return unwrapResult(await response.json() as JsonRpcEnvelope)
  }
}
