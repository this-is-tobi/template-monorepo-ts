import type { FastifyRequest } from 'fastify'
import { db, dbRo } from '~/prisma/__mocks__/clients.js'
import { createProjectServiceKey, listProjectServiceKeys, revokeProjectServiceKey } from './service-keys.js'

vi.mock('~/database.js')

const { mockCreateApiKey } = vi.hoisted(() => ({ mockCreateApiKey: vi.fn() }))
vi.mock('~/modules/auth/auth.js', () => ({
  auth: { api: { createApiKey: mockCreateApiKey } },
}))

const logAsync = vi.fn()

/** A request as the routes hand it over: authenticated, with the audit logger. */
function request() {
  return {
    session: { user: { id: 'admin-1' } },
    server: { auditLogger: { logAsync } },
    id: 'req-1',
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as FastifyRequest
}

const project = { id: 'proj-1', name: 'Apollo', organizationId: 'org-1' }

function keyRow(over: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    name: 'CI deploy',
    start: 'tmts_ab',
    prefix: 'tmts',
    enabled: true,
    permissions: JSON.stringify({ project: ['read'] }),
    lastRequest: null,
    expiresAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  }
}

describe('[Projects] - Service keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateApiKey.mockResolvedValue({ id: 'key-1', key: 'secret-value', ...keyRow() })
  })

  describe('listProjectServiceKeys', () => {
    it('should return nothing when the project never minted a key', async () => {
      // No account is provisioned until the first key, so this is the normal
      // empty state rather than an error.
      dbRo.user.findFirst.mockResolvedValueOnce(null)

      await expect(listProjectServiceKeys('proj-1')).resolves.toEqual({ data: [], total: 0 })
      expect(dbRo.apiKey.findMany).not.toHaveBeenCalled()
    })

    it('should list only keys owned by this project\'s account', async () => {
      dbRo.user.findFirst.mockResolvedValueOnce({ id: 'svc-1' } as never)
      dbRo.apiKey.findMany.mockResolvedValueOnce([keyRow()] as never)

      const result = await listProjectServiceKeys('proj-1')

      expect(dbRo.apiKey.findMany).toHaveBeenCalledWith({
        where: { referenceId: 'svc-1' },
        orderBy: { createdAt: 'desc' },
      })
      expect(result.total).toBe(1)
      expect(result.data[0]).toMatchObject({ id: 'key-1', permissions: { project: ['read'] } })
    })

    it('should never return the secret', async () => {
      dbRo.user.findFirst.mockResolvedValueOnce({ id: 'svc-1' } as never)
      dbRo.apiKey.findMany.mockResolvedValueOnce([{ ...keyRow(), key: 'hashed-secret' }] as never)

      const result = await listProjectServiceKeys('proj-1')

      expect(JSON.stringify(result)).not.toContain('hashed-secret')
      expect(result.data[0]).not.toHaveProperty('key')
    })

    it('should survive permissions that are not valid JSON', async () => {
      dbRo.user.findFirst.mockResolvedValueOnce({ id: 'svc-1' } as never)
      dbRo.apiKey.findMany.mockResolvedValueOnce([keyRow({ permissions: 'not-json' })] as never)

      const result = await listProjectServiceKeys('proj-1')

      expect(result.data[0]!.permissions).toBeNull()
    })
  })

  describe('createProjectServiceKey', () => {
    beforeEach(() => {
      dbRo.user.findFirst.mockResolvedValue({ id: 'svc-1' } as never)
    })

    it('should mint the key against the project\'s account, not the caller', async () => {
      // The whole point: the credential outlives whoever created it.
      await createProjectServiceKey(request(), project, { name: 'CI', permissions: { project: ['read'] } })

      expect(mockCreateApiKey.mock.calls[0]![0].body.userId).toBe('svc-1')
      expect(mockCreateApiKey.mock.calls[0]![0].body.userId).not.toBe('admin-1')
    })

    it('should pin the scope to this project and its organization', async () => {
      await createProjectServiceKey(request(), project, { name: 'CI', permissions: { project: ['read'] } })

      expect(mockCreateApiKey.mock.calls[0]![0].body.metadata).toEqual({
        projectIds: ['proj-1'],
        organizationIds: ['org-1'],
      })
    })

    it('should scope to the project alone when it has no organization', async () => {
      await createProjectServiceKey(
        request(),
        { ...project, organizationId: null },
        { name: 'CI', permissions: { project: ['read'] } },
      )

      expect(mockCreateApiKey.mock.calls[0]![0].body.metadata).toEqual({ projectIds: ['proj-1'] })
    })

    it('should ignore any scope the caller tries to smuggle in', async () => {
      // A project admin is not necessarily trusted org-wide, so the request
      // body must never be able to widen the key's reach.
      await createProjectServiceKey(
        request(),
        project,
        { name: 'CI', permissions: { project: ['read'] }, projectIds: ['other-project'], metadata: { organizationIds: ['other-org'] } } as never,
      )

      expect(mockCreateApiKey.mock.calls[0]![0].body.metadata).toEqual({
        projectIds: ['proj-1'],
        organizationIds: ['org-1'],
      })
    })

    it('should return the secret exactly once, alongside the public row', async () => {
      const result = await createProjectServiceKey(request(), project, { name: 'CI', permissions: { project: ['read'] } })

      expect(result.key).toBe('secret-value')
      expect(result.data).not.toHaveProperty('key')
    })

    it('should record who minted it, since the key itself will not say', async () => {
      await createProjectServiceKey(request(), project, { name: 'CI', permissions: { project: ['read'] } })

      expect(logAsync).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'admin-1',
        action: 'project:service-key:create',
        resourceId: 'proj-1',
      }))
    })

    it('should omit expiresIn rather than send undefined', async () => {
      await createProjectServiceKey(request(), project, { name: 'CI', permissions: { project: ['read'] } })

      expect(mockCreateApiKey.mock.calls[0]![0].body).not.toHaveProperty('expiresIn')
    })

    describe('self-perpetuating grants', () => {
      it('should refuse a key that could mint further keys', async () => {
        // Otherwise revoking the key would not end the access it stands for:
        // its replacement is already issued, and nobody reviewing the
        // revocation would see it.
        await expect(createProjectServiceKey(request(), project, {
          name: 'CI',
          permissions: { 'service-key': ['create'] },
        })).rejects.toMatchObject({ statusCode: 403 })

        expect(mockCreateApiKey).not.toHaveBeenCalled()
      })

      it('should refuse a key that could hand a person access', async () => {
        await expect(createProjectServiceKey(request(), project, {
          name: 'CI',
          permissions: { project: ['read', 'manage-members'] },
        })).rejects.toMatchObject({ statusCode: 403 })
      })

      it('should not let a wildcard action smuggle one in', async () => {
        // `{project: ['*']}` covers manage-members without ever naming it.
        await expect(createProjectServiceKey(request(), project, {
          name: 'CI',
          permissions: { project: ['*'] },
        })).rejects.toMatchObject({ statusCode: 403 })
      })

      it('should name what was refused, so the caller can fix it', async () => {
        await expect(createProjectServiceKey(request(), project, {
          name: 'CI',
          permissions: { 'service-key': ['create', 'delete'] },
        })).rejects.toThrow(/service-key:create, service-key:delete/)
      })

      it('should still allow the ordinary grants alongside them', async () => {
        await expect(createProjectServiceKey(request(), project, {
          name: 'CI',
          permissions: { project: ['read', 'update', 'delete'] },
        })).resolves.toBeDefined()
      })
    })
  })

  describe('revokeProjectServiceKey', () => {
    it('should delete the key rather than merely disabling it', async () => {
      dbRo.user.findFirst.mockResolvedValueOnce({ id: 'svc-1' } as never)
      dbRo.apiKey.findFirst.mockResolvedValueOnce(keyRow() as never)

      await revokeProjectServiceKey(request(), project, 'key-1')

      expect(db.apiKey.delete).toHaveBeenCalledWith({ where: { id: 'key-1' } })
      expect(db.apiKey.update).not.toHaveBeenCalled()
    })

    it('should refuse a key belonging to another project', async () => {
      // Looked up against *this* project's account, so guessing another
      // project's key id gets a 404 rather than a revocation.
      dbRo.user.findFirst.mockResolvedValueOnce({ id: 'svc-1' } as never)
      dbRo.apiKey.findFirst.mockResolvedValueOnce(null)

      await expect(revokeProjectServiceKey(request(), project, 'someone-elses-key'))
        .rejects
        .toMatchObject({ statusCode: 404 })
      expect(db.apiKey.delete).not.toHaveBeenCalled()
    })

    it('should 404 when the project has no service account at all', async () => {
      dbRo.user.findFirst.mockResolvedValueOnce(null)

      await expect(revokeProjectServiceKey(request(), project, 'key-1'))
        .rejects
        .toMatchObject({ statusCode: 404 })
      expect(db.apiKey.delete).not.toHaveBeenCalled()
    })

    it('should audit the revocation', async () => {
      dbRo.user.findFirst.mockResolvedValueOnce({ id: 'svc-1' } as never)
      dbRo.apiKey.findFirst.mockResolvedValueOnce(keyRow() as never)

      await revokeProjectServiceKey(request(), project, 'key-1')

      expect(logAsync).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'admin-1',
        action: 'project:service-key:revoke',
        details: expect.objectContaining({ keyId: 'key-1' }),
      }))
    })
  })
})
