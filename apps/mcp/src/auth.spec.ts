import type { AuthResult } from './auth.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@template-monorepo-ts/shared', () => {
  const mockGetSession = vi.fn()
  return {
    createAuthenticatedClient: vi.fn(() => ({
      auth: { getSession: mockGetSession },
    })),
    _mockGetSession: mockGetSession,
  }
})

const { createAuthenticatedClient, _mockGetSession: mockGetSession } = await import('@template-monorepo-ts/shared') as unknown as {
  createAuthenticatedClient: ReturnType<typeof vi.fn>
  _mockGetSession: ReturnType<typeof vi.fn>
}
const { validateAuth, jsonError } = await import('./auth.js')

describe('validateAuth', () => {
  const serverUrl = 'http://localhost:8081'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns undefined when no credentials are provided', async () => {
    const req = new Request('http://localhost/mcp', { method: 'POST' })

    const result = await validateAuth(req, serverUrl)

    expect(result).toBeUndefined()
    expect(createAuthenticatedClient).not.toHaveBeenCalled()
  })

  it('returns undefined when Authorization header is not Bearer', async () => {
    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    })

    const result = await validateAuth(req, serverUrl)

    expect(result).toBeUndefined()
  })

  it('validates bearer token and returns auth result', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        user: { id: 'user-1', name: 'Alice' },
        session: { userId: 'user-1' },
      },
    })

    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer my-token' },
    })

    const result = await validateAuth(req, serverUrl)

    expect(createAuthenticatedClient).toHaveBeenCalledWith({
      serverUrl,
      token: 'my-token',
      apiKey: undefined,
    })
    expect(result).toEqual<AuthResult>({
      userId: 'user-1',
      name: 'Alice',
      method: 'bearer',
      credential: 'my-token',
    })
  })

  it('validates API key and returns auth result', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        user: { id: 'user-2', name: 'Bob' },
        session: { userId: 'user-2' },
      },
    })

    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'x-api-key': 'key-123' },
    })

    const result = await validateAuth(req, serverUrl)

    expect(createAuthenticatedClient).toHaveBeenCalledWith({
      serverUrl,
      token: undefined,
      apiKey: 'key-123',
    })
    expect(result).toEqual<AuthResult>({
      userId: 'user-2',
      name: 'Bob',
      method: 'apiKey',
      credential: 'key-123',
    })
  })

  it('prefers bearer token over API key when both provided', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        user: { id: 'user-1', name: 'Alice' },
      },
    })

    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer my-token',
        'x-api-key': 'key-123',
      },
    })

    const result = await validateAuth(req, serverUrl)

    expect(result?.method).toBe('bearer')
    expect(result?.credential).toBe('my-token')
  })

  it('returns undefined when API rejects credentials', async () => {
    mockGetSession.mockRejectedValue(new Error('Unauthorized'))

    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid-token' },
    })

    const result = await validateAuth(req, serverUrl)

    expect(result).toBeUndefined()
  })

  it('returns undefined when session has no user ID', async () => {
    mockGetSession.mockResolvedValue({
      data: { user: {}, session: {} },
    })

    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer my-token' },
    })

    const result = await validateAuth(req, serverUrl)

    expect(result).toBeUndefined()
  })

  it('falls back to session.userId when user.id is missing', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { userId: 'user-from-session' },
      },
    })

    const req = new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer my-token' },
    })

    const result = await validateAuth(req, serverUrl)

    expect(result?.userId).toBe('user-from-session')
    expect(result?.name).toBe('unknown')
  })
})

describe('jsonError', () => {
  it('returns a JSON Response with the given status', async () => {
    const res = jsonError(404, 'Not found')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
  })

  it('returns a JSON Response with 401 status', async () => {
    const res = jsonError(401, 'Unauthorized')

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })
})
