import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '@template-monorepo-ts/shared'
import { ApiError } from '@template-monorepo-ts/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAuthTools } from './auth.js'

function createMockServer() {
  return { registerTool: vi.fn() } as unknown as McpServer
}

function createMockClient() {
  return {
    auth: {
      getSession: vi.fn(),
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

describe('registerAuthTools', () => {
  let server: McpServer
  let client: ApiClient

  beforeEach(() => {
    vi.clearAllMocks()
    server = createMockServer()
    client = createMockClient()
    registerAuthTools(server, client)
  })

  it('registers 1 auth tool', () => {
    expect(server.registerTool).toHaveBeenCalledTimes(1)
  })

  it('registers whoami tool', () => {
    const calls = vi.mocked(server.registerTool).mock.calls as unknown as RegisterToolCall[]
    expect(calls[0][0]).toBe('whoami')
  })

  describe('whoami', () => {
    it('returns session data on success', async () => {
      const sessionData = {
        session: { id: 'sess-1', userId: 'user-1' },
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      }
      vi.mocked(client.auth.getSession).mockResolvedValue({
        data: sessionData,
        status: 200,
        statusText: 'OK',
      })

      const handler = getHandler(server, 'whoami')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(client.auth.getSession).toHaveBeenCalled()
      expect(result.isError).toBeUndefined()
      expect(JSON.parse(result.content[0].text)).toEqual(sessionData)
    })

    it('returns error when not authenticated', async () => {
      vi.mocked(client.auth.getSession).mockRejectedValue(
        new ApiError(401, 'Unauthorized', { message: 'Not authenticated' }),
      )

      const handler = getHandler(server, 'whoami')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('401')
    })
  })
})
