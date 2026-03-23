import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiKeysStore } from '~/stores/api-keys'
import { mountPage } from '~/test/helpers'
import ApiKeysPage from './ApiKeysPage.vue'

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
})
