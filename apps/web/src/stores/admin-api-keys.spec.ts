import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminApiKeysStore } from './admin-api-keys'

const mockGetApiKeys = vi.fn()

vi.mock('~/lib/api', () => ({
  apiClient: {
    admin: {
      getApiKeys: (...args: unknown[]) => mockGetApiKeys(...args),
    },
  },
}))

const mockApiKey = {
  id: 'ak-1',
  configId: 'c-1',
  name: 'Test Key',
  start: 'pk_',
  prefix: 'pk',
  referenceId: 'u-1',
  enabled: true,
  permissions: null,
  expiresAt: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

describe('useAdminApiKeysStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should start with empty state', () => {
    const store = useAdminApiKeysStore()
    expect(store.apiKeys).toEqual([])
    expect(store.total).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchApiKeys', () => {
    it('should populate apiKeys on success', async () => {
      mockGetApiKeys.mockResolvedValue({ data: { data: [mockApiKey], total: 1 } })
      const store = useAdminApiKeysStore()
      await store.fetchApiKeys()
      expect(store.apiKeys).toEqual([mockApiKey])
      expect(store.total).toBe(1)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should pass query parameters', async () => {
      mockGetApiKeys.mockResolvedValue({ data: { data: [], total: 0 } })
      const store = useAdminApiKeysStore()
      await store.fetchApiKeys({ name: 'test', enabled: 'true' })
      expect(mockGetApiKeys).toHaveBeenCalledWith({ name: 'test', enabled: 'true' })
    })

    it('should set error on failure', async () => {
      mockGetApiKeys.mockRejectedValue(new Error('Forbidden'))
      const store = useAdminApiKeysStore()
      await store.fetchApiKeys()
      expect(store.apiKeys).toEqual([])
      expect(store.error).toBe('Forbidden')
      expect(store.loading).toBe(false)
    })

    it('should handle non-Error throws', async () => {
      mockGetApiKeys.mockRejectedValue('unexpected')
      const store = useAdminApiKeysStore()
      await store.fetchApiKeys()
      expect(store.error).toBe('Failed to fetch API keys')
    })
  })
})
