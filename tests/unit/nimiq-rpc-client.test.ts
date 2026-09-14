import { describe, expect, it, vi } from 'vitest'
import { NimiqJsonRpcAdapter } from '../../src/server/nimiq/rpc-client'

function response(data: unknown) { return new Response(JSON.stringify({ jsonrpc: '2.0', result: { data, metadata: null }, id: 1 })) }

describe('Nimiq JSON-RPC adapter', () => {
  it('normalizes PoS recipientData, from/to, networkId, and blockNumber', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({
      hash: 'tx', from: 'buyer', to: 'merchant', value: 100_000, recipientData: 'np:v1:01ARZ3NDEKTSV4RRFFQ69G5FAV',
      networkId: 2, blockNumber: 99, executionResult: true, timestamp: 1_000,
    }))
    const adapter = new NimiqJsonRpcAdapter('https://rpc.example', fetcher)
    await expect(adapter.getTransactionByHash('tx')).resolves.toMatchObject({ sender: 'buyer', recipient: 'merchant', network: 2, blockHeight: 99, dataText: 'np:v1:01ARZ3NDEKTSV4RRFFQ69G5FAV' })
  })

  it('uses getMacroBlockOf and latest block height rather than batch arithmetic', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response(180))
      .mockResolvedValueOnce(response({ number: 179 }))
      .mockResolvedValueOnce(response(180))
      .mockResolvedValueOnce(response({ number: 180 }))
    const adapter = new NimiqJsonRpcAdapter('https://rpc.example', fetcher)
    await expect(adapter.isTransactionFinalized(123)).resolves.toBe(false)
    await expect(adapter.isTransactionFinalized(123)).resolves.toBe(true)
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({ method: 'getMacroBlockOf', params: [123] })
  })
})
