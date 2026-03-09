import type { McpConfig } from './config.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock auth — controls whether requests are authenticated
// ---------------------------------------------------------------------------
const mockValidateAuth = vi.fn()
vi.mock('./auth.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./auth.js')>()
  return {
    ...original,
    validateAuth: (...args: unknown[]) => mockValidateAuth(...args),
  }
})

// Mock the MCP transport to avoid real MCP protocol handling
const mockHandleRequest = vi.fn()
const mockConnect = vi.fn()
vi.mock('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js', () => {
  const WebStandardStreamableHTTPServerTransport = vi.fn(function (this: Record<string, unknown>) {
    this.handleRequest = mockHandleRequest
  })
  return { WebStandardStreamableHTTPServerTransport }
})

vi.mock('./server.js', () => ({
  createServer: vi.fn(() => ({
    connect: mockConnect,
  })),
}))

vi.mock('@template-monorepo-ts/shared', () => ({
  createAuthenticatedClient: vi.fn(() => ({})),
}))

const { createRequestHandler } = await import('./http-server.js')

// ---------------------------------------------------------------------------
// Test config
// ---------------------------------------------------------------------------
const config: McpConfig = {
  serverUrl: 'http://localhost:8081',
  transport: 'http',
  http: { host: '127.0.0.1', port: 0 },
}

describe('createRequestHandler', () => {
  let handler: (req: Request) => Promise<Response>

  beforeEach(() => {
    vi.clearAllMocks()
    handler = createRequestHandler(config)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('gET /healthz', () => {
    it('returns 200 OK without auth', async () => {
      const res = await handler(new Request('http://localhost/healthz'))

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ status: 'OK' })
    })
  })

  describe('unknown routes', () => {
    it('returns 404 for unknown paths', async () => {
      const res = await handler(new Request('http://localhost/unknown'))

      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: 'Not found' })
    })
  })

  describe('pOST /mcp', () => {
    it('returns 401 when auth fails', async () => {
      mockValidateAuth.mockResolvedValue(undefined)

      const res = await handler(new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }))

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toContain('Unauthorized')
    })

    it('delegates to MCP transport when authenticated via bearer', async () => {
      mockValidateAuth.mockResolvedValue({
        userId: 'u1',
        name: 'Alice',
        method: 'bearer' as const,
        credential: 'tok',
      })
      mockHandleRequest.mockResolvedValue(Response.json({ jsonrpc: '2.0', id: 1, result: {} }))

      const res = await handler(new Request('http://localhost/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer tok',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
      }))

      expect(res.status).toBe(200)
      expect(mockConnect).toHaveBeenCalled()
      expect(mockHandleRequest).toHaveBeenCalled()

      const { createAuthenticatedClient } = await import('@template-monorepo-ts/shared')
      expect(createAuthenticatedClient).toHaveBeenCalledWith({
        serverUrl: 'http://localhost:8081',
        token: 'tok',
        apiKey: undefined,
      })
    })

    it('delegates to MCP transport when authenticated via API key', async () => {
      mockValidateAuth.mockResolvedValue({
        userId: 'u2',
        name: 'Bot',
        method: 'apiKey' as const,
        credential: 'key-abc',
      })
      mockHandleRequest.mockResolvedValue(Response.json({ jsonrpc: '2.0', id: 1, result: {} }))

      const res = await handler(new Request('http://localhost/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'key-abc',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
      }))

      expect(res.status).toBe(200)

      const { createAuthenticatedClient } = await import('@template-monorepo-ts/shared')
      expect(createAuthenticatedClient).toHaveBeenCalledWith({
        serverUrl: 'http://localhost:8081',
        token: undefined,
        apiKey: 'key-abc',
      })
    })
  })

  describe('non-POST /mcp', () => {
    it('returns 405 for GET /mcp', async () => {
      const res = await handler(new Request('http://localhost/mcp'))

      expect(res.status).toBe(405)
      const body = await res.json()
      expect(body.error).toContain('Method not allowed')
    })

    it('returns 405 for DELETE /mcp', async () => {
      const res = await handler(new Request('http://localhost/mcp', { method: 'DELETE' }))

      expect(res.status).toBe(405)
    })
  })
})
