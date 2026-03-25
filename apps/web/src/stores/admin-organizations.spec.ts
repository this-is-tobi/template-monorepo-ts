import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminOrganizationsStore } from './admin-organizations'

const mockGetOrganizations = vi.fn()

vi.mock('~/lib/api', () => ({
  apiClient: {
    admin: {
      getOrganizations: (...args: unknown[]) => mockGetOrganizations(...args),
    },
  },
}))

const mockOrg = {
  id: 'org-1',
  name: 'Test Org',
  slug: 'test-org',
  logo: null,
  metadata: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  memberCount: 5,
}

describe('useAdminOrganizationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should start with empty state', () => {
    const store = useAdminOrganizationsStore()
    expect(store.organizations).toEqual([])
    expect(store.total).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchOrganizations', () => {
    it('should populate organizations on success', async () => {
      mockGetOrganizations.mockResolvedValue({ data: { data: [mockOrg], total: 1 } })
      const store = useAdminOrganizationsStore()
      await store.fetchOrganizations()
      expect(store.organizations).toEqual([mockOrg])
      expect(store.total).toBe(1)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should pass query parameters', async () => {
      mockGetOrganizations.mockResolvedValue({ data: { data: [], total: 0 } })
      const store = useAdminOrganizationsStore()
      await store.fetchOrganizations({ name: 'test', slug: 'test' })
      expect(mockGetOrganizations).toHaveBeenCalledWith({ name: 'test', slug: 'test' })
    })

    it('should set error on failure', async () => {
      mockGetOrganizations.mockRejectedValue(new Error('Forbidden'))
      const store = useAdminOrganizationsStore()
      await store.fetchOrganizations()
      expect(store.organizations).toEqual([])
      expect(store.error).toBe('Forbidden')
      expect(store.loading).toBe(false)
    })

    it('should handle non-Error throws', async () => {
      mockGetOrganizations.mockRejectedValue('unexpected')
      const store = useAdminOrganizationsStore()
      await store.fetchOrganizations()
      expect(store.error).toBe('Failed to fetch organizations')
    })
  })
})
