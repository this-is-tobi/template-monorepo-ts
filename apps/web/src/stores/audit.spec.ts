import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuditStore } from './audit'

const mockGetLogs = vi.fn()

vi.mock('~/lib/api', () => ({
  apiClient: {
    audit: {
      getLogs: (...args: unknown[]) => mockGetLogs(...args),
    },
  },
}))

const mockEntry = {
  id: 'a-1',
  actorId: 'user-1',
  action: 'project:create',
  resourceType: 'project',
  resourceId: 'p-1',
  details: { name: 'My Project' },
  createdAt: '2025-01-01T00:00:00.000Z',
}

describe('useAuditStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should start with empty state', () => {
    const store = useAuditStore()
    expect(store.entries).toEqual([])
    expect(store.total).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchLogs', () => {
    it('should populate entries on success', async () => {
      mockGetLogs.mockResolvedValue({ data: { data: [mockEntry], total: 1 } })
      const store = useAuditStore()
      await store.fetchLogs()
      expect(store.entries).toEqual([mockEntry])
      expect(store.total).toBe(1)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should pass query parameters', async () => {
      mockGetLogs.mockResolvedValue({ data: { data: [], total: 0 } })
      const store = useAuditStore()
      await store.fetchLogs({ actorId: 'user-1', limit: 10 })
      expect(mockGetLogs).toHaveBeenCalledWith({ actorId: 'user-1', limit: 10 })
    })

    it('should set error on failure', async () => {
      mockGetLogs.mockRejectedValue(new Error('Forbidden'))
      const store = useAuditStore()
      await store.fetchLogs()
      expect(store.entries).toEqual([])
      expect(store.error).toBe('Forbidden')
      expect(store.loading).toBe(false)
    })

    it('should handle non-Error throws', async () => {
      mockGetLogs.mockRejectedValue('unexpected')
      const store = useAuditStore()
      await store.fetchLogs()
      expect(store.error).toBe('Failed to fetch audit logs')
    })
  })
})
