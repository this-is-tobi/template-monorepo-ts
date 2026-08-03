import { hasWildcardPermission, validateKeyGrant } from './permissions.js'

const { mockHasPermission, mockCheckProjectRole } = vi.hoisted(() => ({
  mockHasPermission: vi.fn(),
  mockCheckProjectRole: vi.fn(),
}))
vi.mock('~/modules/auth/permissions.js', () => ({
  callHasPermission: (...args: unknown[]) => mockHasPermission(...args),
  checkProjectRolePermission: (...args: unknown[]) => mockCheckProjectRole(...args),
}))

function actor(over: Record<string, unknown> = {}) {
  return { userId: 'user-1', isAdmin: false, headers: {}, ...over }
}

function grant(over: Record<string, unknown> = {}) {
  return { permissions: { project: ['read'] }, organizationIds: ['org-1'], kind: 'user' as const, ...over }
}

describe('[ApiKeys] - Key grant validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasPermission.mockResolvedValue({ success: true })
    mockCheckProjectRole.mockReturnValue(false)
  })

  describe('hasWildcardPermission', () => {
    it('should spot a wildcard in either position', () => {
      expect(hasWildcardPermission({ '*': ['read'] })).toBe(true)
      expect(hasWildcardPermission({ project: ['*'] })).toBe(true)
    })

    it('should not flag an ordinary grant', () => {
      expect(hasWildcardPermission({ project: ['read', 'update'] })).toBe(false)
      expect(hasWildcardPermission({})).toBe(false)
    })
  })

  describe('inheriting the owner', () => {
    it('should allow an empty set', async () => {
      // Inheriting re-resolves against live membership on every request, so it
      // can never outrun what the owner can currently do.
      for (const permissions of [null, undefined, {}]) {
        await expect(validateKeyGrant(actor(), grant({ permissions }))).resolves.toEqual({ valid: true })
      }
      expect(mockHasPermission).not.toHaveBeenCalled()
    })
  })

  describe('vocabulary', () => {
    it('should refuse a resource the server does not define', async () => {
      // `authorize()` can never approve one, but `matchApiKeyPermissions`
      // compares the stored column by name — so an unknown resource is inert
      // only until someone adds a real resource with that name.
      await expect(validateKeyGrant(actor(), grant({ permissions: { billing: ['read'] } })))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('Unknown permissions') })
    })

    it('should refuse an action the resource does not define', async () => {
      await expect(validateKeyGrant(actor(), grant({ permissions: { project: ['teleport'] } })))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('project:teleport') })
    })

    it('should refuse it even for a platform admin', async () => {
      // Admins may grant anything real; nothing may grant something imaginary.
      await expect(validateKeyGrant(actor({ isAdmin: true }), grant({ permissions: { billing: ['read'] } })))
        .resolves
        .toMatchObject({ valid: false })
    })

    it('should still accept wildcards, which are checked separately', async () => {
      await expect(validateKeyGrant(actor({ isAdmin: true }), grant({ permissions: { '*': ['*'] } })))
        .resolves
        .toEqual({ valid: true })
    })
  })

  describe('wildcards', () => {
    it('should let a platform admin hold one', async () => {
      await expect(validateKeyGrant(actor({ isAdmin: true }), grant({ permissions: { '*': ['*'] } })))
        .resolves
        .toEqual({ valid: true })
    })

    it('should refuse one from anyone else', async () => {
      await expect(validateKeyGrant(actor(), grant({ permissions: { '*': ['*'] } })))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('Wildcard') })
    })

    it('should refuse a wildcard action just as firmly as a wildcard resource', async () => {
      await expect(validateKeyGrant(actor(), grant({ permissions: { project: ['*'] } })))
        .resolves
        .toMatchObject({ valid: false })
    })
  })

  describe('service keys', () => {
    const serviceGrant = (permissions: Record<string, string[]>) =>
      grant({ permissions, kind: 'service' as const })

    it('should refuse a wildcard even from a platform admin', async () => {
      // A wildcard grants the banned pairs without naming them, which makes
      // the ban list below unenforceable. Machine credentials spell it out.
      await expect(validateKeyGrant(actor({ isAdmin: true }), serviceGrant({ '*': ['*'] })))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('explicitly') })
    })

    it('should refuse a key that could mint further keys', async () => {
      await expect(validateKeyGrant(actor({ isAdmin: true }), serviceGrant({ 'service-key': ['create'] })))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('service-key:create') })
    })

    it('should refuse a key that could hand a person access', async () => {
      await expect(validateKeyGrant(actor({ isAdmin: true }), serviceGrant({ project: ['manage-members'] })))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('project:manage-members') })
    })

    it('should apply the bans before the admin exemption', async () => {
      // The bans are about what a credential may be, not about who is asking.
      await expect(validateKeyGrant(actor({ isAdmin: true }), serviceGrant({ 'service-key': ['delete'] })))
        .resolves
        .toMatchObject({ valid: false })
    })

    it('should let a project role cover what the org role does not', async () => {
      // A project admin is routinely a plain org member holding nothing at
      // org level; an org-only check would refuse them a key on their own
      // project.
      mockCheckProjectRole.mockReturnValue(true)
      mockHasPermission.mockResolvedValue({ success: false })

      await expect(validateKeyGrant(actor({ projectRole: 'admin' }), serviceGrant({ project: ['read'] })))
        .resolves
        .toEqual({ valid: true })
      expect(mockHasPermission).not.toHaveBeenCalled()
    })

    it('should still ask the org about anything the project role misses', async () => {
      // `audit:read` is not a project-role grant, so it has to come from the
      // organization or not at all.
      mockCheckProjectRole.mockImplementation((_role: string, perms: Record<string, string[]>) => 'project' in perms)
      mockHasPermission.mockResolvedValue({ success: false })

      await expect(validateKeyGrant(
        actor({ projectRole: 'admin' }),
        serviceGrant({ project: ['read'], audit: ['read'] }),
      ))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('exceed your current role') })

      expect(mockHasPermission).toHaveBeenCalledWith(expect.objectContaining({
        permissions: { audit: ['read'] },
      }))
    })
  })

  describe('scope', () => {
    it('should refuse permissions with no organization to pin them to', async () => {
      // An unscoped key skips the scope check entirely, so "no scope" on a
      // permissioned key means every tenant, never none.
      await expect(validateKeyGrant(actor(), grant({ organizationIds: [] })))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('active organization') })
    })

    it('should require every scoped organization to grant it, not just one', async () => {
      mockHasPermission
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false })

      await expect(validateKeyGrant(actor(), grant({ organizationIds: ['org-1', 'org-2'] })))
        .resolves
        .toMatchObject({ valid: false })
    })
  })

  describe('the caller must hold what they grant', () => {
    it('should allow a set their role covers', async () => {
      await expect(validateKeyGrant(actor(), grant())).resolves.toEqual({ valid: true })
      expect(mockHasPermission).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        organizationId: 'org-1',
        permissions: { project: ['read'] },
      }))
    })

    it('should refuse a set their role does not', async () => {
      mockHasPermission.mockResolvedValueOnce({ success: false })

      await expect(validateKeyGrant(actor(), grant({ permissions: { organization: ['delete'] } })))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('exceed your current role') })
    })

    it('should treat a null answer from the checker as a denial', async () => {
      mockHasPermission.mockResolvedValueOnce(null)

      await expect(validateKeyGrant(actor(), grant())).resolves.toMatchObject({ valid: false })
    })
  })
})
