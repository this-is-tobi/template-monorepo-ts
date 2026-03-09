import type { AuthenticatedClientConfig } from '@template-monorepo-ts/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from './client.js'

describe('createClient', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ version: '1.0.0' }), { status: 200 }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates client with correct base URL', async () => {
    const config: AuthenticatedClientConfig = { serverUrl: 'http://localhost:3000' }
    const client = createClient(config)
    await client.system.getVersion()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/version',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('sets bearer token header when token is provided', async () => {
    const config: AuthenticatedClientConfig = { serverUrl: 'http://localhost:3000', token: 'my-token' }
    const client = createClient(config)
    await client.system.getVersion()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    )
  })

  it('sets API key header when apiKey is provided', async () => {
    const config: AuthenticatedClientConfig = { serverUrl: 'http://localhost:3000', apiKey: 'my-key' }
    const client = createClient(config)
    await client.system.getVersion()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'my-key',
        }),
      }),
    )
  })

  it('prefers bearer token over API key when both provided', async () => {
    const config: AuthenticatedClientConfig = {
      serverUrl: 'http://localhost:3000',
      token: 'my-token',
      apiKey: 'my-key',
    }
    const client = createClient(config)
    await client.system.getVersion()

    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer my-token')
    expect(headers['x-api-key']).toBeUndefined()
  })

  it('sets no auth headers when neither token nor apiKey provided', async () => {
    const config: AuthenticatedClientConfig = { serverUrl: 'http://localhost:3000' }
    const client = createClient(config)
    await client.system.getVersion()

    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    expect(headers['x-api-key']).toBeUndefined()
  })
})
