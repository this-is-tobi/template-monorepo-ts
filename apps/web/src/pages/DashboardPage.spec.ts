import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardWidgets } from '~/lib/dashboard'
import { useAuthStore } from '~/stores/auth'
import { mockAdminUser, mockUser, mountPage } from '~/test/helpers'
import DashboardPage from './DashboardPage.vue'

// The page only composes widgets — each widget owns its own fetching and is
// covered by its own spec, so nothing here needs the API.
vi.mock('~/lib/api', () => ({
  apiClient: {
    audit: { getLogs: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }) },
    projects: { getAll: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }) },
  },
}))

vi.mock('~/lib/auth', () => ({
  authClient: {
    useActiveOrganization: vi.fn().mockReturnValue({ value: null }),
    apiKey: { listMyApiKeys: vi.fn().mockResolvedValue({ data: { apiKeys: [] } }) },
    organization: {
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      listUserInvitations: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  },
}))

describe('dashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the dashboard heading', async () => {
    const { wrapper } = await mountPage(DashboardPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Dashboard')
  })

  it('should greet the signed-in user by name', async () => {
    const { wrapper } = await mountPage(DashboardPage)
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    await flushPromises()
    expect(wrapper.text()).toContain('Welcome back, Test User')
  })

  describe('widget registry', () => {
    it('should render every widget the registry declares for an admin', async () => {
      const { wrapper } = await mountPage(DashboardPage)
      const auth = useAuthStore()
      auth.user = { ...mockAdminUser }
      await flushPromises()

      // Each widget renders as its own component node under shallowMount.
      for (const widget of dashboardWidgets) {
        expect(wrapper.findComponent(widget.component).exists()).toBe(true)
      }
    })

    it('should hide widgets gated behind a capability the user lacks', async () => {
      const gated = dashboardWidgets.filter(w => w.visible?.({ isAdmin: false }) === false)
      // Guard the assumption the registry still has a gated widget to test.
      expect(gated.length).toBeGreaterThan(0)

      const { wrapper } = await mountPage(DashboardPage)
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      await flushPromises()

      for (const widget of gated) {
        expect(wrapper.findComponent(widget.component).exists()).toBe(false)
      }
    })

    it('should place half-width widgets in the two-column grid', async () => {
      const { wrapper } = await mountPage(DashboardPage)
      const auth = useAuthStore()
      auth.user = { ...mockAdminUser }
      await flushPromises()

      const grid = wrapper.find('.lg\\:grid-cols-2')
      expect(grid.exists()).toBe(true)

      const half = dashboardWidgets.filter(w => w.span === 'half')
      for (const widget of half) {
        expect(grid.findComponent(widget.component).exists()).toBe(true)
      }
    })
  })
})
