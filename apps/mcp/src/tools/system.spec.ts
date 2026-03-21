import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '@template-monorepo-ts/shared'
import { ApiError } from '@template-monorepo-ts/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerSystemTools } from './system.js'

function createMockServer() {
  return { registerTool: vi.fn() } as unknown as McpServer
}

function createMockClient() {
  return {
    system: {
      getVersion: vi.fn(),
      getHealth: vi.fn(),
      getReady: vi.fn(),
      getLive: vi.fn(),
    },
  } as unknown as ApiClient
}

type RegisterToolCall = [string, Record<string, unknown>, (...args: unknown[]) => Promise<unknown>]

function getHandler(server: McpServer, toolName: string) {
  const calls = vi.mocked(server.registerTool).mock.calls as unknown as RegisterToolCall[]
  const call = calls.find(c => c[0] === toolName)
  if (!call) throw new Error(`Tool "${toolName}" not registered`)
  return call[2]
}

describe('registerSystemTools', () => {
  let server: McpServer
  let client: ApiClient

  beforeEach(() => {
    vi.clearAllMocks()
    server = createMockServer()
    client = createMockClient()
    registerSystemTools(server, client)
  })

  it('registers 4 system tools', () => {
    expect(server.registerTool).toHaveBeenCalledTimes(4)
  })

  it('registers tools with correct names', () => {
    const calls = vi.mocked(server.registerTool).mock.calls as unknown as RegisterToolCall[]
    const names = calls.map(c => c[0])
    expect(names).toEqual(['get-version', 'get-health', 'get-ready', 'get-live'])
  })

  describe('get-version', () => {
    it('returns version on success', async () => {
      vi.mocked(client.system.getVersion).mockResolvedValue({
        data: { version: '2.1.0' },
        status: 200,
        statusText: 'OK',
      })

      const handler = getHandler(server, 'get-version')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(client.system.getVersion).toHaveBeenCalled()
      expect(result.isError).toBeUndefined()
      expect(JSON.parse(result.content[0].text)).toEqual({ version: '2.1.0' })
    })

    it('returns error on failure', async () => {
      vi.mocked(client.system.getVersion).mockRejectedValue(
        new ApiError(500, 'Internal Server Error'),
      )

      const handler = getHandler(server, 'get-version')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('500')
    })
  })

  describe('get-health', () => {
    it('returns health status on success', async () => {
      vi.mocked(client.system.getHealth).mockResolvedValue({
        data: { status: 'OK' },
        status: 200,
        statusText: 'OK',
      })

      const handler = getHandler(server, 'get-health')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(client.system.getHealth).toHaveBeenCalled()
      expect(result.isError).toBeUndefined()
      expect(JSON.parse(result.content[0].text)).toEqual({ status: 'OK' })
    })

    it('returns error on failure', async () => {
      vi.mocked(client.system.getHealth).mockRejectedValue(
        new ApiError(503, 'Service Unavailable'),
      )

      const handler = getHandler(server, 'get-health')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('503')
    })
  })

  describe('get-ready', () => {
    it('returns readiness status on success', async () => {
      vi.mocked(client.system.getReady).mockResolvedValue({
        data: { status: 'OK' },
        status: 200,
        statusText: 'OK',
      })

      const handler = getHandler(server, 'get-ready')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(client.system.getReady).toHaveBeenCalled()
      expect(result.isError).toBeUndefined()
      expect(JSON.parse(result.content[0].text)).toEqual({ status: 'OK' })
    })

    it('returns error when not ready', async () => {
      vi.mocked(client.system.getReady).mockRejectedValue(
        new ApiError(503, 'Service Unavailable'),
      )

      const handler = getHandler(server, 'get-ready')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('503')
    })
  })

  describe('get-live', () => {
    it('returns liveness status on success', async () => {
      vi.mocked(client.system.getLive).mockResolvedValue({
        data: { status: 'OK' },
        status: 200,
        statusText: 'OK',
      })

      const handler = getHandler(server, 'get-live')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(client.system.getLive).toHaveBeenCalled()
      expect(result.isError).toBeUndefined()
      expect(JSON.parse(result.content[0].text)).toEqual({ status: 'OK' })
    })

    it('returns error on failure', async () => {
      vi.mocked(client.system.getLive).mockRejectedValue(
        new ApiError(500, 'Internal Server Error'),
      )

      const handler = getHandler(server, 'get-live')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('500')
    })
  })
})
