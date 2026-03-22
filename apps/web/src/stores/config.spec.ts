import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConfigStore } from './config'

const { mockConfigGet } = vi.hoisted(() => ({
  mockConfigGet: vi.fn(),
}))

vi.mock('~/lib/api', () => ({
  apiClient: {
    config: {
      get: (...args: unknown[]) => mockConfigGet(...args),
    },
  },
}))

describe('useConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have registration enabled and no SSO providers by default', () => {
      const store = useConfigStore()
      expect(store.config).toStrictEqual({ enableRegistration: true })
      expect(store.ssoProviders).toStrictEqual([])
      expect(store.loaded).toBe(false)
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchConfig', () => {
    it('should fetch config and ssoProviders from API', async () => {
      mockConfigGet.mockResolvedValueOnce({
        data: { data: { enableRegistration: false }, ssoProviders: ['keycloak'] },
      })

      const store = useConfigStore()
      await store.fetchConfig()

      expect(store.config).toStrictEqual({ enableRegistration: false })
      expect(store.ssoProviders).toStrictEqual(['keycloak'])
      expect(store.loaded).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('should keep defaults on API error', async () => {
      mockConfigGet.mockRejectedValueOnce(new Error('network error'))

      const store = useConfigStore()
      await store.fetchConfig()

      expect(store.config).toStrictEqual({ enableRegistration: true })
      expect(store.ssoProviders).toStrictEqual([])
      expect(store.loaded).toBe(true)
      expect(store.loading).toBe(false)
    })
  })
})
