import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '@template-monorepo-ts/shared'
import { ApiError } from '@template-monorepo-ts/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerProjectTools } from './projects.js'

function createMockServer() {
  return { registerTool: vi.fn() } as unknown as McpServer
}

function createMockClient() {
  return {
    projects: {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

describe('registerProjectTools', () => {
  let server: McpServer
  let client: ApiClient

  beforeEach(() => {
    vi.clearAllMocks()
    server = createMockServer()
    client = createMockClient()
    registerProjectTools(server, client)
  })

  it('registers 5 project tools', () => {
    expect(server.registerTool).toHaveBeenCalledTimes(5)
  })

  it('registers tools with correct names', () => {
    const calls = vi.mocked(server.registerTool).mock.calls as unknown as RegisterToolCall[]
    const names = calls.map(c => c[0])
    expect(names).toEqual([
      'list-projects',
      'get-project',
      'create-project',
      'update-project',
      'delete-project',
    ])
  })

  describe('list-projects', () => {
    it('returns projects on success', async () => {
      const projects = [{ id: '1', name: 'Alpha', ownerId: 'u1' }, { id: '2', name: 'Beta', ownerId: 'u2' }]
      vi.mocked(client.projects.getAll).mockResolvedValue({
        data: { data: projects },
        status: 200,
        statusText: 'OK',
      })

      const handler = getHandler(server, 'list-projects')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(client.projects.getAll).toHaveBeenCalled()
      expect(result.isError).toBeUndefined()
      expect(JSON.parse(result.content[0].text)).toEqual({ data: projects })
    })

    it('returns error on failure', async () => {
      vi.mocked(client.projects.getAll).mockRejectedValue(
        new ApiError(401, 'Unauthorized', { message: 'Invalid token' }),
      )

      const handler = getHandler(server, 'list-projects')
      const result = await handler({}) as { content: Array<{ text: string }>, isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('401')
    })
  })

  describe('get-project', () => {
    it('returns project on success', async () => {
      const project = { id: 'abc', name: 'My Project', ownerId: 'u1' }
      vi.mocked(client.projects.getById).mockResolvedValue({
        data: { data: project },
        status: 200,
        statusText: 'OK',
      })

      const handler = getHandler(server, 'get-project')
      const result = await handler({ id: 'abc' }) as { content: Array<{ text: string }>, isError?: boolean }

      expect(client.projects.getById).toHaveBeenCalledWith('abc')
      expect(result.isError).toBeUndefined()
    })

    it('returns error when not found', async () => {
      vi.mocked(client.projects.getById).mockRejectedValue(
        new ApiError(404, 'Not Found'),
      )

      const handler = getHandler(server, 'get-project')
      const result = await handler({ id: 'missing' }) as { content: Array<{ text: string }>, isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('404')
    })
  })

  describe('create-project', () => {
    it('creates project on success', async () => {
      const created = { id: 'new-id', name: 'New Project', ownerId: 'u1', description: null }
      vi.mocked(client.projects.create).mockResolvedValue({
        data: { data: created },
        status: 201,
        statusText: 'Created',
      })

      const handler = getHandler(server, 'create-project')
      const result = await handler({ name: 'New Project' }) as { content: Array<{ text: string }>, isError?: boolean }

      expect(client.projects.create).toHaveBeenCalledWith({ name: 'New Project', description: undefined })
      expect(result.isError).toBeUndefined()
    })

    it('creates project with description', async () => {
      vi.mocked(client.projects.create).mockResolvedValue({
        data: { data: { id: '1', name: 'Proj', ownerId: 'u1', description: 'Desc' } },
        status: 201,
        statusText: 'Created',
      })

      const handler = getHandler(server, 'create-project')
      await handler({ name: 'Proj', description: 'Desc' })

      expect(client.projects.create).toHaveBeenCalledWith({ name: 'Proj', description: 'Desc' })
    })

    it('returns error on validation failure', async () => {
      vi.mocked(client.projects.create).mockRejectedValue(
        new ApiError(400, 'Bad Request', { message: 'Name too short' }),
      )

      const handler = getHandler(server, 'create-project')
      const result = await handler({ name: 'ab' }) as { content: Array<{ text: string }>, isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('400')
    })
  })

  describe('update-project', () => {
    it('updates project on success', async () => {
      vi.mocked(client.projects.update).mockResolvedValue({
        data: { data: { id: 'abc', name: 'Updated', ownerId: 'u1' } },
        status: 200,
        statusText: 'OK',
      })

      const handler = getHandler(server, 'update-project')
      const result = await handler({ id: 'abc', name: 'Updated' }) as { content: Array<{ text: string }>, isError?: boolean }

      expect(client.projects.update).toHaveBeenCalledWith('abc', { name: 'Updated', description: undefined })
      expect(result.isError).toBeUndefined()
    })

    it('returns error on failure', async () => {
      vi.mocked(client.projects.update).mockRejectedValue(
        new ApiError(404, 'Not Found', { message: 'Project not found' }),
      )

      const handler = getHandler(server, 'update-project')
      const result = await handler({ id: 'abc', name: 'Updated' }) as { content: Array<{ text: string }>, isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('404')
    })
  })

  describe('delete-project', () => {
    it('deletes project on success', async () => {
      vi.mocked(client.projects.delete).mockResolvedValue({
        data: { message: 'Deleted' },
        status: 200,
        statusText: 'OK',
      })

      const handler = getHandler(server, 'delete-project')
      const result = await handler({ id: 'abc' }) as { content: Array<{ text: string }>, isError?: boolean }

      expect(client.projects.delete).toHaveBeenCalledWith('abc')
      expect(result.isError).toBeUndefined()
    })

    it('returns error on forbidden', async () => {
      vi.mocked(client.projects.delete).mockRejectedValue(
        new ApiError(403, 'Forbidden', { message: 'Not allowed' }),
      )

      const handler = getHandler(server, 'delete-project')
      const result = await handler({ id: 'abc' }) as { content: Array<{ text: string }>, isError?: boolean }

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('403')
    })
  })
})
