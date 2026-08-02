import { randomUUID } from 'node:crypto'
import { apiPrefix } from '@template-monorepo-ts/shared'
import app from '~/app.js'
import { MOCK_ADMIN_ID, MOCK_USER_ID, mockUserSession } from '~/modules/auth/__mocks__/middleware.js'
import { auth } from '~/modules/auth/auth.js'
import { requireAuth } from '~/modules/auth/middleware.js'
import { db, dbRo } from '~/prisma/__mocks__/clients.js'

vi.mock('~/database.js')

/** Authenticate the next request as a regular (non-admin) user. */
function asRegularUser() {
  vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
    req.session = mockUserSession as never
  })
}

describe('[ApiKeys] - Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const keyId = randomUUID()
  const mockKey = {
    id: keyId,
    configId: 'default',
    name: 'Test Key',
    start: 'tm_',
    prefix: 'tm',
    referenceId: MOCK_ADMIN_ID,
    enabled: true,
    permissions: null,
    metadata: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('updateApiKey', () => {
    it('should update API key name', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      db.apiKey.update.mockResolvedValueOnce({ ...mockKey, name: 'Renamed' } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ name: 'Renamed' })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json().data.name).toEqual('Renamed')
    })

    it('should update permissions', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      const perms = { project: ['read', 'create'] }
      db.apiKey.update.mockResolvedValueOnce({ ...mockKey, permissions: JSON.stringify(perms) } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ permissions: perms })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(db.apiKey.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ permissions: JSON.stringify(perms) }),
      }))
    })

    it('should update scope metadata', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      // User is a member of org-1
      db.member.count.mockResolvedValueOnce(1 as never)
      db.apiKey.update.mockResolvedValueOnce({ ...mockKey, metadata: '{"organizationIds":["org-1"]}' } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ organizationIds: ['org-1'], projectIds: [] })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(db.apiKey.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ metadata: JSON.stringify({ organizationIds: ['org-1'] }) }),
      }))
    })

    it('should return 403 when scoping to an inaccessible organization', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      // User is NOT a member of the requested org
      db.member.count.mockResolvedValueOnce(0 as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ organizationIds: ['org-not-mine'] })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INVALID_SCOPE')
      expect(db.apiKey.update).not.toHaveBeenCalled()
    })

    it('should return 403 when scoping to an inaccessible project', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      // User is NOT a member of the requested project
      db.projectMember.count.mockResolvedValueOnce(0 as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ projectIds: ['proj-not-mine'] })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INVALID_SCOPE')
      expect(db.apiKey.update).not.toHaveBeenCalled()
    })

    it('should clear metadata when scope arrays are empty', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      db.apiKey.update.mockResolvedValueOnce({ ...mockKey, metadata: null } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ organizationIds: [], projectIds: [] })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(db.apiKey.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ metadata: null }),
      }))
    })

    it('should return 404 when key does not exist', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(null)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${randomUUID()}`)
        .body({ name: 'X' })
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('should return 403 when user does not own the key', async () => {
      vi.mocked(requireAuth).mockImplementationOnce(async (req) => {
        req.session = mockUserSession as never
      })
      dbRo.apiKey.findUnique.mockResolvedValueOnce({ ...mockKey, referenceId: 'other-user' } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ name: 'X' })
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('should return 400 for invalid body', async () => {
      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ name: '' })
        .end()

      expect(response.statusCode).toEqual(400)
    })
  })

  describe('updateApiKey — privilege escalation', () => {
    // The `permissions` column is authoritative at request time: a match in
    // `requirePermission` grants the action outright, without consulting the
    // owner's org or project standing. Creation has always validated it; this
    // endpoint used to write it straight through, so a key minted with no
    // permissions could be widened afterwards and then used across
    // organizations its owner had no membership in.
    const ownedKey = { ...mockKey, referenceId: MOCK_USER_ID }

    it('should refuse a wildcard from a non-admin', async () => {
      asRegularUser()
      dbRo.apiKey.findUnique.mockResolvedValueOnce(ownedKey as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ permissions: { '*': ['*'] } })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toContain('Wildcard')
      expect(db.apiKey.update).not.toHaveBeenCalled()
    })

    it('should refuse permissions the caller\'s role does not cover', async () => {
      asRegularUser()
      dbRo.apiKey.findUnique.mockResolvedValueOnce(ownedKey as never)
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: false, error: null } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ permissions: { organization: ['delete'] } })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('INSUFFICIENT_PERMISSIONS')
      expect(db.apiKey.update).not.toHaveBeenCalled()
    })

    it('should allow permissions the caller\'s role does cover', async () => {
      asRegularUser()
      dbRo.apiKey.findUnique.mockResolvedValueOnce(ownedKey as never)
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: true, error: null } as never)
      db.apiKey.update.mockResolvedValueOnce({ ...ownedKey, permissions: '{"project":["read"]}' } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ permissions: { project: ['read'] } })
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it('should pin a newly-permissioned key to the org it was checked against', async () => {
      // Otherwise the key keeps a permission set validated against one org
      // while remaining usable in every other.
      asRegularUser()
      dbRo.apiKey.findUnique.mockResolvedValueOnce(ownedKey as never)
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: true, error: null } as never)
      db.apiKey.update.mockResolvedValueOnce(ownedKey as never)

      await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ permissions: { project: ['read'] } })
        .end()

      expect(db.apiKey.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ metadata: JSON.stringify({ organizationIds: ['mock-org-id'] }) }),
      }))
    })

    it('should always allow clearing permissions back to "inherit the owner"', async () => {
      asRegularUser()
      dbRo.apiKey.findUnique.mockResolvedValueOnce(ownedKey as never)
      db.apiKey.update.mockResolvedValueOnce({ ...ownedKey, permissions: null } as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ permissions: null })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(auth.api.hasPermission).not.toHaveBeenCalled()
      expect(db.apiKey.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ permissions: null }),
      }))
    })

    it('should check the permissions against the key\'s own scope, not the active org', async () => {
      // A key already pinned to org-9 will act in org-9, so that is where the
      // caller must hold the rights — the org they happen to have selected in
      // the UI is irrelevant.
      asRegularUser()
      dbRo.apiKey.findUnique.mockResolvedValueOnce({
        ...ownedKey,
        metadata: JSON.stringify({ organizationIds: ['org-9'] }),
      } as never)
      vi.mocked(auth.api.hasPermission).mockResolvedValueOnce({ success: true, error: null } as never)
      db.apiKey.update.mockResolvedValueOnce(ownedKey as never)

      await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ permissions: { project: ['read'] } })
        .end()

      expect(auth.api.hasPermission).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({ organizationId: 'org-9' }),
      }))
    })

    it('should let a platform admin set what they like', async () => {
      dbRo.apiKey.findUnique.mockResolvedValueOnce(mockKey as never)
      db.apiKey.update.mockResolvedValueOnce(mockKey as never)

      const response = await app.inject()
        .put(`${apiPrefix.v1}/api-keys/${keyId}`)
        .body({ permissions: { '*': ['*'] } })
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })
})
