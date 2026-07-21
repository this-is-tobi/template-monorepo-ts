import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth'
import { useOrganizationsStore } from '~/stores/organizations'
import { useProjectsStore } from '~/stores/projects'
import { mockProject, mockUser, mountPage } from '~/test/helpers'
import DashboardPage from './DashboardPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    system: {
      getVersion: vi.fn().mockResolvedValue({ data: { version: '1.0.0' } }),
    },
    projects: {
      getAll: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
    },
  },
}))

vi.mock('~/lib/auth', () => ({
  authClient: {
    useActiveOrganization: vi.fn().mockReturnValue({ value: null }),
    apiKey: {
      listMyApiKeys: vi.fn().mockResolvedValue({ data: { apiKeys: [] } }),
    },
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

  it('should render dashboard heading', async () => {
    const { wrapper } = await mountPage(DashboardPage)
    const projectsStore = useProjectsStore()
    projectsStore.fetchProjects = vi.fn()
    await flushPromises()
    expect(wrapper.text()).toContain('Dashboard')
  })

  it('should display welcome message with user name', async () => {
    const { wrapper } = await mountPage(DashboardPage)
    const auth = useAuthStore()
    const projectsStore = useProjectsStore()
    projectsStore.fetchProjects = vi.fn()
    auth.user = { ...mockUser }
    await flushPromises()
    expect(wrapper.text()).toContain('Welcome back, Test User')
  })

  it('should show project count', async () => {
    const { wrapper } = await mountPage(DashboardPage)
    const projectsStore = useProjectsStore()
    projectsStore.fetchProjects = vi.fn()
    projectsStore.projects = [mockProject]
    await flushPromises()
    expect(wrapper.text()).toContain('1')
  })

  it('should fetch projects scoped to the active organization on mount', async () => {
    await mountPage(DashboardPage)
    await flushPromises()
    const { apiClient } = await import('~/lib/api')
    // Projects are org-scoped (matching /projects), never filtered by ownerId.
    // No active org in this test → no org filter, just the recent-projects limit.
    expect(apiClient.projects.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    )
    expect(apiClient.projects.getAll).not.toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: expect.anything() }),
    )
  })

  it('should render "Account settings" link', async () => {
    const { wrapper } = await mountPage(DashboardPage)
    await flushPromises()
    // The RouterLink stub renders as <a> without the to attribute;
    // assert the link text is present — destination is an e2e concern.
    expect(wrapper.text()).toContain('Account settings')
  })

  it('should display project count from store total', async () => {
    const { wrapper } = await mountPage(DashboardPage)
    const projectsStore = useProjectsStore()
    projectsStore.total = 3
    await flushPromises()
    expect(wrapper.text()).toContain('3')
  })

  it('should display user email', async () => {
    const { wrapper } = await mountPage(DashboardPage)
    const auth = useAuthStore()
    const projectsStore = useProjectsStore()
    projectsStore.fetchProjects = vi.fn()
    auth.user = { ...mockUser }
    await flushPromises()
    expect(wrapper.text()).toContain('test@example.com')
  })

  it('should show pending invitations card when invitations exist', async () => {
    const { wrapper } = await mountPage(DashboardPage)
    await flushPromises()
    const orgStore = useOrganizationsStore()
    orgStore.userInvitations = [
      { id: 'inv-1', organizationId: 'org-1', organizationName: 'Acme', email: 'a@b.com', role: 'member', status: 'pending', inviterId: 'u-1', expiresAt: new Date(), createdAt: new Date() },
    ] as never
    await flushPromises()
    expect(wrapper.text()).toContain('Pending invitations')
    expect(wrapper.text()).toContain('Acme')
    expect(wrapper.text()).toContain('Accept')
  })

  it('should not show invitations card when none pending', async () => {
    const { wrapper } = await mountPage(DashboardPage)
    const orgStore = useOrganizationsStore()
    orgStore.userInvitations = []
    await flushPromises()
    expect(wrapper.text()).not.toContain('Pending invitations')
  })
})
