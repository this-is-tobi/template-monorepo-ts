import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminOrganizationsStore } from '~/stores/admin-organizations'
import { useAuditStore } from '~/stores/audit'
import { useProjectsStore } from '~/stores/projects'
import { mountPage } from '~/test/helpers'
import AdminOrganizationDetailPage from './AdminOrganizationDetailPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    admin: {
      getOrganizationById: vi.fn().mockResolvedValue({ data: { data: null } }),
    },
    audit: {
      getOrgLogs: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
    },
    projects: {
      getAll: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
    },
  },
}))

vi.mock('~/lib/auth', () => ({
  authClient: {
    organization: {
      update: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

const mockOrgDetail = {
  id: 'org-1',
  name: 'Test Org',
  slug: 'test-org',
  logo: null,
  metadata: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  members: [
    { id: 'm-1', userId: 'u-1', role: 'owner', createdAt: '2026-01-01T00:00:00.000Z', user: { id: 'u-1', name: 'Alice', email: 'alice@example.com', image: null } },
    { id: 'm-2', userId: 'u-2', role: 'member', createdAt: '2026-01-02T00:00:00.000Z', user: { id: 'u-2', name: 'Bob', email: 'bob@example.com', image: null } },
  ],
  invitations: [
    { id: 'inv-1', email: 'charlie@example.com', role: 'member', status: 'pending', expiresAt: '2026-02-01T00:00:00.000Z' },
  ],
}

describe('adminOrganizationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', async () => {
    const { wrapper } = await mountPage(AdminOrganizationDetailPage, { route: '/settings/admin/organizations/org-1' })
    const store = useAdminOrganizationsStore()
    store.loading = true
    store.currentOrganization = null
    await flushPromises()
    expect(wrapper.text()).toContain('Loading...')
  })

  it('should display error message', async () => {
    const { wrapper } = await mountPage(AdminOrganizationDetailPage, { route: '/settings/admin/organizations/org-1' })
    const store = useAdminOrganizationsStore()
    store.error = 'Organization not found'
    store.currentOrganization = null
    await flushPromises()
    expect(wrapper.text()).toContain('Organization not found')
  })

  it('should display organization name and slug', async () => {
    const { wrapper } = await mountPage(AdminOrganizationDetailPage, { route: '/settings/admin/organizations/org-1' })
    const store = useAdminOrganizationsStore()
    store.currentOrganization = { ...mockOrgDetail } as never
    await flushPromises()
    expect(wrapper.text()).toContain('Test Org')
    expect(wrapper.text()).toContain('test-org')
  })

  it('should show member count in tab', async () => {
    const { wrapper } = await mountPage(AdminOrganizationDetailPage, { route: '/settings/admin/organizations/org-1' })
    const store = useAdminOrganizationsStore()
    store.currentOrganization = { ...mockOrgDetail } as never
    await flushPromises()
    expect(wrapper.text()).toContain('Members (2)')
  })

  it('should show projects tab', async () => {
    const { wrapper } = await mountPage(AdminOrganizationDetailPage, { route: '/settings/admin/organizations/org-1' })
    const store = useAdminOrganizationsStore()
    store.currentOrganization = { ...mockOrgDetail } as never
    const projectsStore = useProjectsStore()
    projectsStore.projects = []
    await flushPromises()
    expect(wrapper.text()).toContain('Projects (0)')
  })

  it('should show audit tab', async () => {
    const { wrapper } = await mountPage(AdminOrganizationDetailPage, { route: '/settings/admin/organizations/org-1' })
    const store = useAdminOrganizationsStore()
    store.currentOrganization = { ...mockOrgDetail } as never
    const auditStore_ = useAuditStore()
    auditStore_.entries = []
    await flushPromises()
    expect(wrapper.text()).toContain('Audit')
  })

  it('should show back button to admin organizations', async () => {
    const { wrapper } = await mountPage(AdminOrganizationDetailPage, { route: '/settings/admin/organizations/org-1' })
    const store = useAdminOrganizationsStore()
    store.currentOrganization = { ...mockOrgDetail } as never
    await flushPromises()
    expect(wrapper.text()).toContain('All organizations')
  })

  it('should redirect personal orgs to user detail page', async () => {
    const personalOrg = {
      ...mockOrgDetail,
      metadata: JSON.stringify({ personal: true }),
    }
    const { router } = await mountPage(AdminOrganizationDetailPage, { route: '/settings/admin/organizations/org-1' })
    const store = useAdminOrganizationsStore()
    const replaceSpy = vi.spyOn(router, 'replace')
    store.currentOrganization = { ...personalOrg } as never
    await flushPromises()
    expect(replaceSpy).toHaveBeenCalledWith({ name: 'settings-admin-user-detail', params: { id: 'u-1' } })
  })

  it('should show Settings tab with quota fields', async () => {
    const orgWithQuota = {
      ...mockOrgDetail,
      metadata: JSON.stringify({ maxProjects: 5 }),
    }
    const { wrapper } = await mountPage(AdminOrganizationDetailPage, { route: '/settings/admin/organizations/org-1' })
    const store = useAdminOrganizationsStore()
    store.currentOrganization = { ...orgWithQuota } as never
    await flushPromises()
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Quotas')
    expect(wrapper.text()).toContain('Max projects')
    expect(wrapper.text()).toContain('Save changes')
  })
})
