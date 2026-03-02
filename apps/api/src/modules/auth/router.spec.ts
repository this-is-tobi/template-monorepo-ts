import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'

/**
 * Tests for the auth router catch-all route.
 * Since auth.ts is globally mocked, we test the routing behavior
 * without hitting the real BetterAuth handler.
 */

// Unmock auth to get the mock's handler function
const { auth } = await import('~/modules/auth/auth.js')

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
})
