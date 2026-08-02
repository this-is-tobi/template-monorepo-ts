import { hasWildcardPermission, validateApiKeyPermissions } from './permissions.js'

const { mockHasPermission } = vi.hoisted(() => ({ mockHasPermission: vi.fn() }))
vi.mock('~/modules/auth/permissions.js', () => ({
  callHasPermission: (...args: unknown[]) => mockHasPermission(...args),
}))

function ctx(over: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    isAdmin: false,
    organizationIds: ['org-1'],
    headers: {},
    ...over,
  }
}

describe('[ApiKeys] - Permission validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasPermission.mockResolvedValue({ success: true })
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

  describe('validateApiKeyPermissions', () => {
    it('should allow an empty set — it means "inherit the owner"', async () => {
      // Inheriting re-resolves against live membership on every request, so it
      // can never outrun what the owner can currently do.
      await expect(validateApiKeyPermissions(null, ctx())).resolves.toEqual({ valid: true })
      await expect(validateApiKeyPermissions(undefined, ctx())).resolves.toEqual({ valid: true })
      await expect(validateApiKeyPermissions({}, ctx())).resolves.toEqual({ valid: true })
      expect(mockHasPermission).not.toHaveBeenCalled()
    })

    it('should let a platform admin ask for anything', async () => {
      await expect(validateApiKeyPermissions({ '*': ['*'] }, ctx({ isAdmin: true })))
        .resolves
        .toEqual({ valid: true })
    })

    it('should refuse a wildcard from anyone else', async () => {
      await expect(validateApiKeyPermissions({ '*': ['*'] }, ctx()))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('Wildcard') })
      // Denied on the shape alone — no point asking the org.
      expect(mockHasPermission).not.toHaveBeenCalled()
    })

    it('should refuse a wildcard action just as firmly as a wildcard resource', async () => {
      // `{project: ['*']}` silently grows every time an action is added to the
      // matrix, which is exactly what the restriction exists to prevent.
      await expect(validateApiKeyPermissions({ project: ['*'] }, ctx()))
        .resolves
        .toMatchObject({ valid: false })
    })

    it('should refuse permissions with no organization to check them against', async () => {
      await expect(validateApiKeyPermissions({ project: ['read'] }, ctx({ organizationIds: [] })))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('active organization') })
    })

    it('should allow a set the caller\'s role covers', async () => {
      await expect(validateApiKeyPermissions({ project: ['read'] }, ctx()))
        .resolves
        .toEqual({ valid: true })
      expect(mockHasPermission).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        organizationId: 'org-1',
        permissions: { project: ['read'] },
      }))
    })

    it('should refuse a set the caller\'s role does not cover', async () => {
      mockHasPermission.mockResolvedValueOnce({ success: false })

      await expect(validateApiKeyPermissions({ organization: ['delete'] }, ctx()))
        .resolves
        .toMatchObject({ valid: false, reason: expect.stringContaining('exceed your current role') })
    })

    it('should require every scoped organization to grant it, not just one', async () => {
      // A key reaching two orgs must not carry, in org B, a right only held in
      // org A — otherwise widening scope silently widens power.
      mockHasPermission
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false })

      await expect(validateApiKeyPermissions({ project: ['delete'] }, ctx({ organizationIds: ['org-1', 'org-2'] })))
        .resolves
        .toMatchObject({ valid: false })
    })

    it('should treat a null answer from the checker as a denial', async () => {
      mockHasPermission.mockResolvedValueOnce(null)

      await expect(validateApiKeyPermissions({ project: ['read'] }, ctx()))
        .resolves
        .toMatchObject({ valid: false })
    })
  })
})
