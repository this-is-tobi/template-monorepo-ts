import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiKeysStore } from './api-keys'

const mockList = vi.fn()
const mockCreate = vi.fn()
const mockDelete = vi.fn()

vi.mock('~/lib/auth', () => ({
  authClient: {
    apiKey: {
      list: (...args: unknown[]) => mockList(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
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
})
