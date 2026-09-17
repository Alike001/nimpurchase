import { Buffer } from 'node:buffer'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRequest } from '../src/server/index.js'

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const body = request.body ? Buffer.from(await request.arrayBuffer()) : undefined
    const requestedPath = url.pathname === '/api/[...path]' ? `/api/${url.searchParams.get('path') ?? ''}` : url.pathname
    const incoming = {
      method: request.method,
      url: `${requestedPath}${url.pathname === '/api/[...path]' ? '' : url.search}`,
      headers: Object.fromEntries(request.headers.entries()),
      async *[Symbol.asyncIterator]() { if (body) yield body },
    } as unknown as IncomingMessage

    let status = 200
    let responseBody = ''
    const headers = new Headers()
    const outgoing = {
      writeHead(code: number, values: Record<string, string>) {
        status = code
        Object.entries(values).forEach(([name, value]) => headers.set(name, value))
        return outgoing
      },
      end(value?: string | Uint8Array) { responseBody = value ? Buffer.from(value).toString() : '' },
    } as unknown as ServerResponse

    await handleRequest(incoming, outgoing)
    return new Response(responseBody, { status, headers })
  },
}
