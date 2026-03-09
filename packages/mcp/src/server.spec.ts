import type { ApiClient } from '@template-monorepo-ts/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  const McpServer = vi.fn(function (this: Record<string, unknown>) {
    this.registerTool = vi.fn()
  })
  return { McpServer }
})

vi.mock('./tools/index.js', () => ({
  registerProjectTools: vi.fn(),
  registerAuthTools: vi.fn(),
  registerSystemTools: vi.fn(),
}))

const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js')
const { registerProjectTools, registerAuthTools, registerSystemTools } = await import('./tools/index.js')
const { createServer } = await import('./server.js')

describe('createServer', () => {
  const mockClient = {
    projects: {},
    auth: {},
    system: {},
  } as unknown as ApiClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an McpServer instance', () => {
    createServer(mockClient)

    expect(McpServer).toHaveBeenCalledWith({
      name: 'template-monorepo-ts',
      version: '1.0.0',
    })
  })

  it('registers project tools', () => {
    createServer(mockClient)

    expect(registerProjectTools).toHaveBeenCalledWith(
      expect.anything(),
      mockClient,
    )
  })

  it('registers auth tools', () => {
    createServer(mockClient)

    expect(registerAuthTools).toHaveBeenCalledWith(
      expect.anything(),
      mockClient,
    )
  })

  it('registers system tools', () => {
    createServer(mockClient)

    expect(registerSystemTools).toHaveBeenCalledWith(
      expect.anything(),
      mockClient,
    )
  })

  it('returns the server instance', () => {
    const server = createServer(mockClient)

    expect(server).toBeDefined()
    expect(server.registerTool).toBeDefined()
  })
})
