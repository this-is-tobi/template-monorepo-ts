import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrgLookup } from './useOrgLookup'

const mockGetOrganizations = vi.fn()

vi.mock('~/lib/api', () => ({
  apiClient: {
    admin: {
      getOrganizations: (...args: unknown[]) => mockGetOrganizations(...args),
    },
  },
}))

describe('useOrgLookup', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should return the raw id when org is not cached', () => {
    const lookup = useOrgLookup()
    expect(lookup.getOrgName('unknown-id')).toBe('unknown-id')
    expect(lookup.getOrg('unknown-id')).toBeUndefined()
  })

  it('should resolve orgs from the admin API and cache them', async () => {
    mockGetOrganizations.mockResolvedValue({
      data: {
        data: [
          { id: 'org-1', name: 'Org One', slug: 'org-one' },
          { id: 'org-2', name: 'Org Two', slug: 'org-two' },
        ],
      },
    })

    const lookup = useOrgLookup()
    await lookup.resolveOrgs(['org-1', 'org-2'])

    expect(lookup.getOrgName('org-1')).toBe('Org One')
    expect(lookup.getOrg('org-2')).toEqual({ id: 'org-2', name: 'Org Two', slug: 'org-two' })
    expect(mockGetOrganizations).toHaveBeenCalledWith({ limit: 200, offset: 0 })
  })

  it('should skip already-cached orgs', async () => {
    mockGetOrganizations.mockResolvedValue({
      data: { data: [{ id: 'org-1', name: 'Org One', slug: 'org-one' }] },
    })

    const lookup = useOrgLookup()
    await lookup.resolveOrgs(['org-1'])
    mockGetOrganizations.mockClear()

    await lookup.resolveOrgs(['org-1'])
    expect(mockGetOrganizations).not.toHaveBeenCalled()
  })

  it('should skip empty ids', async () => {
    const lookup = useOrgLookup()
    await lookup.resolveOrgs(['', ''])
    expect(mockGetOrganizations).not.toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    mockGetOrganizations.mockRejectedValue(new Error('Network error'))

    const lookup = useOrgLookup()
    await lookup.resolveOrgs(['org-1'])

    expect(lookup.getOrgName('org-1')).toBe('org-1')
  })
})
