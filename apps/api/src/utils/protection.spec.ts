import type { FastifyInstance, FastifyRequest } from 'fastify'
import { createProtection, getRouteParam } from './protection.js'

vi.mock('./fastify.js', () => ({
  createZodValidationHandler: vi.fn().mockReturnValue('zod-handler'),
}))

function makeApp() {
  return {
    requireAuth: 'auth-handler',
    requireRole: vi.fn().mockReturnValue('admin-handler'),
    requirePermission: vi.fn().mockReturnValue('perm-handler'),
  } as unknown as FastifyInstance
}

const fakeRoute = { path: '/foo', method: 'GET' as const, responses: {} }

describe('utils/protection - createProtection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds the auth chain (auth + zod validation)', () => {
    const app = makeApp()
    const chain = createProtection(app).auth(fakeRoute as never)

    expect(chain).toStrictEqual(['auth-handler', 'zod-handler'])
  })

  it('builds the admin chain (auth + zod + admin role)', () => {
    const app = makeApp()
    const chain = createProtection(app).admin(fakeRoute as never)

    expect(app.requireRole).toHaveBeenCalledWith('admin')
    expect(chain).toStrictEqual(['auth-handler', 'zod-handler', 'admin-handler'])
  })

  it('builds a permission chain forwarding shorthand record options', () => {
    const app = makeApp()
    const chain = createProtection(app).permission(fakeRoute as never, { project: ['create'] })

    expect(app.requirePermission).toHaveBeenCalledWith({ project: ['create'] })
    expect(chain).toStrictEqual(['auth-handler', 'zod-handler', 'perm-handler'])
  })

  it('inserts extra preHandlers between zod validation and the permission check', () => {
    const app = makeApp()
    const preload = (async () => {}) as never
    const chain = createProtection(app).permission(
      fakeRoute as never,
      { permissions: { project: ['delete'] } },
      [preload],
    )

    expect(chain).toStrictEqual(['auth-handler', 'zod-handler', preload, 'perm-handler'])
  })

  it('forwards full RequirePermissionOptions (with extractors) verbatim', () => {
    const app = makeApp()
    const opts = {
      permissions: { project: ['update'] as string[] },
      getOwnerId: () => 'owner-1',
      getOrganizationId: () => 'org-1',
    }

    createProtection(app).permission(fakeRoute as never, opts)

    expect(app.requirePermission).toHaveBeenCalledWith(opts)
  })
})

describe('utils/protection - getRouteParam', () => {
  it('reads a string param from the request', () => {
    const req = { params: { id: 'abc-123' } } as unknown as FastifyRequest
    expect(getRouteParam(req, 'id')).toBe('abc-123')
  })

  it('reads a different param key from the same request', () => {
    const req = { params: { id: '1', memberId: '2' } } as unknown as FastifyRequest
    expect(getRouteParam(req, 'memberId')).toBe('2')
  })

  it('returns undefined when the requested key is missing', () => {
    const req = { params: {} } as unknown as FastifyRequest
    expect(getRouteParam(req, 'id' as never)).toBeUndefined()
  })
})
