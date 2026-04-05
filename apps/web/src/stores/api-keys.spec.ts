import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiKeysStore } from './api-keys'

const mockList = vi.fn()
const mockCreate = vi.fn()
const mockDelete = vi.fn()
const mockApiKeysUpdate = vi.fn()

vi.mock('~/lib/auth', () => ({
  authClient: {
    apiKey: {
      list: (...args: unknown[]) => mockList(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}))

vi.mock('~/lib/api', () => ({
  apiClient: {
    apiKeys: {
      update: (...args: unknown[]) => mockApiKeysUpdate(...args),
    },
  },
}))

const mockApiKey = {
  id: 'key-1',
  configId: 'default',
  name: 'Test Key',
  start: 'tm_',
  prefix: 'tm',
  referenceId: 'user-1',
  permissions: { project: ['read'] },
  metadata: null,
  enabled: true,
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('apiKeysStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchApiKeys', () => {
    it('should fetch API keys', async () => {
      mockList.mockResolvedValue({ data: { apiKeys: [mockApiKey] }, error: null })
      const store = useApiKeysStore()

      await store.fetchApiKeys()

      expect(mockList).toHaveBeenCalled()
      expect(store.apiKeys).toEqual([mockApiKey])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle fetch error', async () => {
      mockList.mockResolvedValue({ data: null, error: { message: 'Unauthorized' } })
      const store = useApiKeysStore()

      await store.fetchApiKeys()

      expect(store.apiKeys).toEqual([])
      expect(store.error).toBe('Unauthorized')
    })

    it('should handle unexpected exception', async () => {
      mockList.mockRejectedValue(new Error('Network error'))
      const store = useApiKeysStore()

      await store.fetchApiKeys()

      expect(store.error).toBe('Network error')
      expect(store.loading).toBe(false)
    })
  })

  describe('createApiKey', () => {
    it('should create an API key and refresh list', async () => {
      mockCreate.mockResolvedValue({ data: { key: 'tm_secret123' }, error: null })
      mockList.mockResolvedValue({ data: { apiKeys: [mockApiKey] }, error: null })
      const store = useApiKeysStore()

      const result = await store.createApiKey({ name: 'Test Key', permissions: { project: ['read'] } })

      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Test Key',
        expiresIn: undefined,
        permissions: { project: ['read'] },
      })
      expect(result).toEqual({ key: 'tm_secret123' })
      expect(mockList).toHaveBeenCalled()
    })

    it('should pass metadata with scope restrictions', async () => {
      mockCreate.mockResolvedValue({ data: { key: 'tm_scoped' }, error: null })
      mockList.mockResolvedValue({ data: { apiKeys: [] }, error: null })
      const store = useApiKeysStore()

      await store.createApiKey({
        name: 'Scoped Key',
        organizationIds: ['org-1', 'org-2'],
        projectIds: ['proj-1'],
      })

      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Scoped Key',
        expiresIn: undefined,
        permissions: undefined,
        metadata: { organizationIds: ['org-1', 'org-2'], projectIds: ['proj-1'] },
      })
    })

    it('should not pass metadata when scope arrays are empty', async () => {
      mockCreate.mockResolvedValue({ data: { key: 'tm_noscope' }, error: null })
      mockList.mockResolvedValue({ data: { apiKeys: [] }, error: null })
      const store = useApiKeysStore()

      await store.createApiKey({
        name: 'Global Key',
        organizationIds: [],
        projectIds: [],
      })

      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Global Key',
        expiresIn: undefined,
        permissions: undefined,
      })
    })

    it('should handle create error', async () => {
      mockCreate.mockResolvedValue({ data: null, error: { message: 'Invalid name' } })
      const store = useApiKeysStore()

      const result = await store.createApiKey({ name: '' })

      expect(result).toBeNull()
      expect(store.error).toBe('Invalid name')
    })

    it('should handle unexpected exception', async () => {
      mockCreate.mockRejectedValue(new Error('Timeout'))
      const store = useApiKeysStore()

      const result = await store.createApiKey({ name: 'Test' })

      expect(result).toBeNull()
      expect(store.error).toBe('Timeout')
    })
  })

  describe('updateApiKey', () => {
    it('should update permissions and refresh list', async () => {
      mockApiKeysUpdate.mockResolvedValue({ data: { data: mockApiKey } })
      mockList.mockResolvedValue({ data: { apiKeys: [mockApiKey] }, error: null })
      const store = useApiKeysStore()

      const result = await store.updateApiKey('key-1', {
        permissions: { project: ['read', 'create'] },
      })

      expect(mockApiKeysUpdate).toHaveBeenCalledWith('key-1', {
        permissions: { project: ['read', 'create'] },
      })
      expect(result).toBe(true)
      expect(mockList).toHaveBeenCalled()
    })

    it('should pass scope restrictions', async () => {
      mockApiKeysUpdate.mockResolvedValue({ data: { data: mockApiKey } })
      mockList.mockResolvedValue({ data: { apiKeys: [mockApiKey] }, error: null })
      const store = useApiKeysStore()

      await store.updateApiKey('key-1', {
        organizationIds: ['org-1'],
        projectIds: ['proj-1'],
      })

      expect(mockApiKeysUpdate).toHaveBeenCalledWith('key-1', {
        organizationIds: ['org-1'],
        projectIds: ['proj-1'],
      })
    })

    it('should pass empty scope arrays', async () => {
      mockApiKeysUpdate.mockResolvedValue({ data: { data: mockApiKey } })
      mockList.mockResolvedValue({ data: { apiKeys: [mockApiKey] }, error: null })
      const store = useApiKeysStore()

      await store.updateApiKey('key-1', {
        permissions: { project: ['read'] },
        organizationIds: [],
        projectIds: [],
      })

      expect(mockApiKeysUpdate).toHaveBeenCalledWith('key-1', {
        permissions: { project: ['read'] },
        organizationIds: [],
        projectIds: [],
      })
    })

    it('should handle update error', async () => {
      mockApiKeysUpdate.mockRejectedValue(new Error('Forbidden'))
      const store = useApiKeysStore()

      const result = await store.updateApiKey('key-1', { permissions: {} })

      expect(result).toBe(false)
      expect(store.error).toBe('Forbidden')
    })

    it('should handle unexpected exception', async () => {
      mockApiKeysUpdate.mockRejectedValue(new Error('Network error'))
      const store = useApiKeysStore()

      const result = await store.updateApiKey('key-1', { permissions: {} })

      expect(result).toBe(false)
      expect(store.error).toBe('Network error')
    })
  })

  describe('deleteApiKey', () => {
    it('should delete an API key and remove from list', async () => {
      mockDelete.mockResolvedValue({ error: null })
      const store = useApiKeysStore()
      store.apiKeys = [mockApiKey]

      const result = await store.deleteApiKey('key-1')

      expect(mockDelete).toHaveBeenCalledWith({ keyId: 'key-1' })
      expect(result).toBe(true)
      expect(store.apiKeys).toEqual([])
    })

    it('should handle delete error', async () => {
      mockDelete.mockResolvedValue({ error: { message: 'Not found' } })
      const store = useApiKeysStore()
      store.apiKeys = [mockApiKey]

      const result = await store.deleteApiKey('key-1')

      expect(result).toBe(false)
      expect(store.error).toBe('Not found')
      expect(store.apiKeys).toEqual([mockApiKey])
    })
  })

  describe('fetchApiKeyById', () => {
    it('should find key from already loaded list', async () => {
      mockList.mockResolvedValue({ data: { apiKeys: [mockApiKey] }, error: null })
      const store = useApiKeysStore()
      store.apiKeys = [mockApiKey]

      await store.fetchApiKeyById('key-1')

      expect(store.currentApiKey).toEqual(mockApiKey)
      expect(store.error).toBeNull()
    })

    it('should load keys if list is empty then find', async () => {
      mockList.mockResolvedValue({ data: { apiKeys: [mockApiKey] }, error: null })
      const store = useApiKeysStore()

      await store.fetchApiKeyById('key-1')

      expect(mockList).toHaveBeenCalled()
      expect(store.currentApiKey).toEqual(mockApiKey)
    })

    it('should set error if key not found', async () => {
      mockList.mockResolvedValue({ data: { apiKeys: [mockApiKey] }, error: null })
      const store = useApiKeysStore()

      await store.fetchApiKeyById('nonexistent')

      expect(store.currentApiKey).toBeNull()
      expect(store.error).toBe('API key not found')
    })
  })
})
