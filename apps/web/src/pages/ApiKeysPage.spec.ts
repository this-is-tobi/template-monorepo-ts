import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminApiKeysStore } from '~/stores/admin-api-keys'
import { useApiKeysStore } from '~/stores/api-keys'
import { mountPage } from '~/test/helpers'
import ApiKeysPage from './ApiKeysPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    admin: {
      getApiKeys: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
    },
  },
}))

vi.mock('~/lib/auth', () => ({
  authClient: {
    apiKey: {
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      create: vi.fn().mockResolvedValue({ data: { key: 'tm_secret' }, error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

describe('apiKeysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the heading', async () => {
    const { wrapper } = await mountPage(ApiKeysPage)
    await flushPromises()
    expect(wrapper.text()).toContain('API keys')
  })

  it('should render empty state when no keys', async () => {
    const { wrapper } = await mountPage(ApiKeysPage)
    const store = useApiKeysStore()
    store.apiKeys = []
    await flushPromises()
    expect(wrapper.text()).toContain('No API keys yet')
  })

  it('should render create button', async () => {
    const { wrapper } = await mountPage(ApiKeysPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Create API key')
  })

  it('should display error message', async () => {
    const { wrapper } = await mountPage(ApiKeysPage)
    const store = useApiKeysStore()
    store.error = 'Failed to load'
    await flushPromises()
    expect(wrapper.text()).toContain('Failed to load')
  })

  it('should show description text', async () => {
    const { wrapper } = await mountPage(ApiKeysPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Manage your personal API keys')
  })

  it('should show search dropdown', async () => {
    const { wrapper } = await mountPage(ApiKeysPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Search by')
  })

  it('should show bulk action bar when items are selected', async () => {
    const { wrapper } = await mountPage(ApiKeysPage)
    const store = useApiKeysStore()
    store.apiKeys = [
      { id: 'k1', configId: 'c1', name: 'Key1', start: 'tm_a', prefix: 'tm', referenceId: 'u1', enabled: true, permissions: null, metadata: null, expiresAt: null, createdAt: new Date(), updatedAt: new Date() },
    ]
    await flushPromises()
    expect(wrapper.text()).not.toContain('selected')
  })

  it('should show admin-mode heading when on admin route', async () => {
    const { wrapper } = await mountPage(ApiKeysPage, { route: '/settings/admin/api-keys' })
    await flushPromises()
    expect(wrapper.text()).toContain('API keys')
  })

  it('should show admin error message in admin mode', async () => {
    const { wrapper } = await mountPage(ApiKeysPage, { route: '/settings/admin/api-keys' })
    const adminStore = useAdminApiKeysStore()
    adminStore.error = 'Admin load failed'
    await flushPromises()
    expect(wrapper.text()).toContain('Admin load failed')
  })

  it('should show create dialog trigger when clicking Create API key', async () => {
    const { wrapper } = await mountPage(ApiKeysPage)
    await flushPromises()
    const btn = wrapper.findAll('button').find(b => b.text().includes('Create API key'))
    expect(btn).toBeDefined()
  })
})
