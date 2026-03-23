import type { Session } from '~/modules/auth/auth.js'
import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { getConfigQuery } from '~/resources/config/queries.js'

/**
 * Tests for the auth router catch-all route.
 * Since auth.ts is globally mocked, we test the routing behavior
 * without hitting the real BetterAuth handler.
 */

// Unmock auth to get the mock's handler function
const { auth } = await import('~/modules/auth/auth.js')

vi.mock('~/resources/config/queries.js', () => ({
  getConfigQuery: vi.fn().mockResolvedValue({
    enableRegistration: true,
    allowOrganizationCreation: true,
    appName: 'Template Monorepo TS',
    documentationUrl: '',
    maintenanceMode: false,
  }),
  getSsoProviders: vi.fn().mockReturnValue([]),
  invalidateConfigCache: vi.fn(),
}))

describe('[Auth] - router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should forward GET /api/v1/auth/* to BetterAuth handler', async () => {
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .get(`${apiPrefix.v1}/auth/session`)
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should forward POST /api/v1/auth/* to BetterAuth handler', async () => {
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: '1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-in/email`)
      .body({ email: 'test@test.com', password: 'password' })
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should return 500 when BetterAuth handler throws', async () => {
    vi.mocked(auth.handler).mockRejectedValueOnce(new Error('auth error'))

    const response = await app.inject()
      .get(`${apiPrefix.v1}/auth/session`)
      .end()

    expect(response.statusCode).toEqual(500)
    expect(response.json().message).toEqual('Internal authentication error')
  })

  it('should handle response with no body (204 No Content)', async () => {
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    )

    const response = await app.inject()
      .get(`${apiPrefix.v1}/auth/session`)
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(204)
  })

  it('should handle non-Error exception in catch block', async () => {
    vi.mocked(auth.handler).mockRejectedValueOnce('plain string error')

    const response = await app.inject()
      .get(`${apiPrefix.v1}/auth/session`)
      .end()

    expect(response.statusCode).toEqual(500)
    expect(response.json().message).toEqual('Internal authentication error')
  })

  it('should forward a string body (text/plain) directly to BetterAuth', async () => {
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    // Sending a JSON-string literal makes Fastify parse the body as a JS string,
    // so typeof request.body === 'string' is true (covers line 28).
    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-in`)
      .headers({ 'content-type': 'application/json' })
      .payload('"raw string body"')
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should block sign-up when registration is disabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: false, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false })

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-up/email`)
      .body({ email: 'new@test.com', password: 'password', name: 'New User' })
      .end()

    expect(auth.handler).not.toHaveBeenCalled()
    expect(response.statusCode).toEqual(403)
    expect(response.json().message).toEqual('Registration is currently disabled')
  })

  it('should allow sign-up when registration is enabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false })
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: '1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-up/email`)
      .body({ email: 'new@test.com', password: 'password', name: 'New User' })
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should not check config for non-signup auth routes', async () => {
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await app.inject()
      .post(`${apiPrefix.v1}/auth/sign-in/email`)
      .body({ email: 'test@test.com', password: 'password' })
      .end()

    expect(getConfigQuery).not.toHaveBeenCalled()
  })

  it('should block organization creation for non-admin users when disabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: false, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false })
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: '1', role: 'user' } } as unknown as Session)

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/create-organization`)
      .body({ name: 'Test Org' })
      .end()

    expect(auth.handler).not.toHaveBeenCalled()
    expect(response.statusCode).toEqual(403)
    expect(response.json().message).toEqual('Organization creation is currently disabled')
  })

  it('should allow organization creation for admin users even when disabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: false, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false })
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ user: { id: '1', role: 'admin' } } as unknown as Session)
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'org-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/create-organization`)
      .body({ name: 'Test Org' })
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })

  it('should allow organization creation when enabled', async () => {
    vi.mocked(getConfigQuery).mockResolvedValueOnce({ enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false })
    vi.mocked(auth.handler).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'org-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await app.inject()
      .post(`${apiPrefix.v1}/auth/create-organization`)
      .body({ name: 'Test Org' })
      .end()

    expect(auth.handler).toHaveBeenCalledTimes(1)
    expect(response.statusCode).toEqual(200)
  })
})
