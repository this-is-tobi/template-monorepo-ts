import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminApiKeysStore } from '~/stores/admin-api-keys'
import { useApiKeysStore } from '~/stores/api-keys'
import { mountPage } from '~/test/helpers'
import ApiKeyDetailPage from './ApiKeyDetailPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    admin: {
      getApiKeyById: vi.fn().mockResolvedValue({ data: { data: null } }),
      getOrganizations: vi.fn().mockResolvedValue({ data: { data: [] } }),
    },
    apiKeys: {
      update: vi.fn().mockResolvedValue({ data: { data: null } }),
    },
    projects: {
      query: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
    },
  },
}))

vi.mock('~/lib/auth', () => ({
  authClient: {
    admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }) },
    apiKey: {
      list: vi.fn().mockResolvedValue({ data: { apiKeys: [] }, error: null }),
    },
  },
}))

const mockAdminApiKey = {
  id: 'key-1',
  name: 'Test Key',
  start: 'tm_abc',
  referenceId: 'user-1',
  enabled: true,
  permissions: JSON.stringify({ project: ['read', 'create'] }),
  metadata: null as string | null,
  expiresAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
}

const mockUserApiKey = {
  id: 'key-2',
  configId: 'cfg-1',
  name: 'My Key',
  start: 'tm_xyz',
  prefix: 'tm',
  referenceId: 'user-1',
  enabled: true,
  permissions: { project: ['read'] } as Record<string, string[]> | null,
  metadata: null,
  expiresAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
}

describe('apiKeyDetailPage — admin mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/settings/admin/api-keys/key-1' })
    const store = useAdminApiKeysStore()
    store.loading = true
    store.currentApiKey = null
    await flushPromises()
    expect(wrapper.text()).toContain('Loading...')
  })

  it('should display error message', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/settings/admin/api-keys/key-1' })
    const store = useAdminApiKeysStore()
    store.error = 'API key not found'
    store.currentApiKey = null
    await flushPromises()
    expect(wrapper.text()).toContain('API key not found')
  })

  it('should display API key name and status', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/settings/admin/api-keys/key-1' })
    const store = useAdminApiKeysStore()
    store.currentApiKey = { ...mockAdminApiKey } as never
    await flushPromises()
    expect(wrapper.text()).toContain('Test Key')
    expect(wrapper.text()).toContain('Active')
  })

  it('should show tabs for details and permissions & scope', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/settings/admin/api-keys/key-1' })
    const store = useAdminApiKeysStore()
    store.currentApiKey = { ...mockAdminApiKey } as never
    await flushPromises()
    expect(wrapper.text()).toContain('Details')
    expect(wrapper.text()).toContain('Permissions & Scope')
  })

  it('should show key details with field labels', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/settings/admin/api-keys/key-1' })
    const store = useAdminApiKeysStore()
    store.currentApiKey = { ...mockAdminApiKey } as never
    await flushPromises()
    expect(wrapper.text()).toContain('ID')
    expect(wrapper.text()).toContain('key-1')
    expect(wrapper.text()).toContain('Key prefix')
    expect(wrapper.text()).toContain('tm_abc')
    expect(wrapper.text()).toContain('Owner')
    expect(wrapper.text()).toContain('Status')
    expect(wrapper.text()).toContain('Expires')
    expect(wrapper.text()).toContain('Created')
    expect(wrapper.text()).toContain('Updated')
  })

  it('should show back button to admin API keys', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/settings/admin/api-keys/key-1' })
    const store = useAdminApiKeysStore()
    store.currentApiKey = { ...mockAdminApiKey } as never
    await flushPromises()
    expect(wrapper.text()).toContain('All API keys')
  })

  it('should show permissions when present', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/settings/admin/api-keys/key-1' })
    const store = useAdminApiKeysStore()
    store.currentApiKey = { ...mockAdminApiKey } as never
    await flushPromises()
    expect(wrapper.text()).toContain('project')
    expect(wrapper.text()).toContain('read')
    expect(wrapper.text()).toContain('create')
  })

  it('should show unrestricted message when no permissions', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/settings/admin/api-keys/key-1' })
    const store = useAdminApiKeysStore()
    store.currentApiKey = { ...mockAdminApiKey, permissions: null } as never
    await flushPromises()
    expect(wrapper.text()).toContain('All permissions (unrestricted)')
  })

  it('should display disabled status for inactive key', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/settings/admin/api-keys/key-1' })
    const store = useAdminApiKeysStore()
    store.currentApiKey = { ...mockAdminApiKey, enabled: false } as never
    await flushPromises()
    expect(wrapper.text()).toContain('Disabled')
  })

  it('should not show Settings tab in admin mode', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/settings/admin/api-keys/key-1' })
    const store = useAdminApiKeysStore()
    store.currentApiKey = { ...mockAdminApiKey } as never
    await flushPromises()
    expect(wrapper.text()).not.toContain('Settings')
    expect(wrapper.text()).not.toContain('Danger zone')
  })
})

describe('apiKeyDetailPage — user mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/api-keys/key-2' })
    await flushPromises()
    const store = useApiKeysStore()
    store.loading = true
    store.currentApiKey = null
    await flushPromises()
    expect(wrapper.text()).toContain('Loading...')
  })

  it('should display API key name and status', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/api-keys/key-2' })
    await flushPromises()
    const store = useApiKeysStore()
    store.currentApiKey = { ...mockUserApiKey }
    store.error = null
    await flushPromises()
    expect(wrapper.text()).toContain('My Key')
    expect(wrapper.text()).toContain('Active')
  })

  it('should show tabs for details, permissions & scope, and settings', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/api-keys/key-2' })
    await flushPromises()
    const store = useApiKeysStore()
    store.currentApiKey = { ...mockUserApiKey }
    store.error = null
    await flushPromises()
    expect(wrapper.text()).toContain('Details')
    expect(wrapper.text()).toContain('Permissions & Scope')
    expect(wrapper.text()).toContain('Settings')
  })

  it('should not show owner field in user mode', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/api-keys/key-2' })
    await flushPromises()
    const store = useApiKeysStore()
    store.currentApiKey = { ...mockUserApiKey }
    store.error = null
    await flushPromises()
    expect(wrapper.text()).not.toContain('Owner')
  })

  it('should show back button to API keys list', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/api-keys/key-2' })
    await flushPromises()
    const store = useApiKeysStore()
    store.currentApiKey = { ...mockUserApiKey }
    store.error = null
    await flushPromises()
    expect(wrapper.text()).toContain('API keys')
    expect(wrapper.text()).not.toContain('All API keys')
  })

  it('should show permissions from object format', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/api-keys/key-2' })
    await flushPromises()
    const store = useApiKeysStore()
    store.currentApiKey = { ...mockUserApiKey }
    store.error = null
    await flushPromises()
    expect(wrapper.text()).toContain('project')
    expect(wrapper.text()).toContain('read')
  })

  it('should show editable permission matrix when no permissions set', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/api-keys/key-2' })
    await flushPromises()
    const store = useApiKeysStore()
    store.currentApiKey = { ...mockUserApiKey, permissions: null }
    store.error = null
    await flushPromises()
    expect(wrapper.text()).toContain('Leave empty for unrestricted access')
  })

  it('should display error message', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/api-keys/key-2' })
    const store = useApiKeysStore()
    store.error = 'API key not found'
    store.currentApiKey = null
    await flushPromises()
    expect(wrapper.text()).toContain('API key not found')
  })

  it('should show settings tab with save and danger zone', async () => {
    const { wrapper } = await mountPage(ApiKeyDetailPage, { route: '/api-keys/key-2' })
    await flushPromises()
    const store = useApiKeysStore()
    store.currentApiKey = { ...mockUserApiKey }
    store.error = null
    await flushPromises()
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Danger zone')
    expect(wrapper.text()).toContain('Delete this API key')
    expect(wrapper.text()).toContain('Save changes')
  })
})
