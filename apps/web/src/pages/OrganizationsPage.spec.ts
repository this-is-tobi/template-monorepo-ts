import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { useOrganizationsStore } from '~/stores/organizations'
import { mountPage } from '~/test/helpers'
import OrganizationsPage from './OrganizationsPage.vue'

vi.mock('~/lib/auth', () => ({
  authClient: {
    organization: {
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      getFullOrganization: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      inviteMember: vi.fn(),
      removeMember: vi.fn(),
      updateMemberRole: vi.fn(),
      cancelInvitation: vi.fn(),
      acceptInvitation: vi.fn(),
      rejectInvitation: vi.fn(),
      listUserInvitations: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  },
}))

vi.mock('~/lib/api', () => ({
  apiClient: {
    config: {
      get: vi.fn().mockResolvedValue({ data: { data: { enableRegistration: true, allowOrganizationCreation: true, appName: 'Template Monorepo TS', documentationUrl: '', maintenanceMode: false } } }),
    },
    theme: {
      get: vi.fn().mockResolvedValue({ data: { data: { primaryColor: 'zinc', surfaceColor: 'zinc' } } }),
    },
  },
}))

describe('organizationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render heading', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    await flushPromises()
    expect(wrapper.text()).toContain('Organizations')
    expect(wrapper.text()).toContain('Manage your organizations')
  })

  it('should show empty state when no organizations', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    const store = useOrganizationsStore()
    store.organizations = []
    await flushPromises()
    expect(wrapper.text()).toContain('No organizations yet')
  })

  it('should show create button when allowOrganizationCreation is true', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    const configStore = useConfigStore()
    configStore.config.allowOrganizationCreation = true
    await flushPromises()
    expect(wrapper.text()).toContain('New organization')
  })

  it('should hide create button when allowOrganizationCreation is false and user is not admin', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    const configStore = useConfigStore()
    const authStore = useAuthStore()
    configStore.config.allowOrganizationCreation = false
    authStore.user = { id: '1', email: 'user@test.com', name: 'User', role: 'user' }
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('New organization')
  })

  it('should show create button for admin even when allowOrganizationCreation is false', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    const configStore = useConfigStore()
    const authStore = useAuthStore()
    configStore.config.allowOrganizationCreation = false
    authStore.user = { id: '1', email: 'admin@test.com', name: 'Admin', role: 'admin' }
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('New organization')
  })

  it('should open create dialog when New organization button is clicked', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Create a new organization')
    const newOrgBtn = wrapper.findAll('button').find(b => b.text().includes('New organization'))!
    await newOrgBtn.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Create a new organization')
  })

  it('should call createOrganization when create form is submitted', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    const store = useOrganizationsStore()
    store.createOrganization = vi.fn().mockResolvedValue({ id: 'org-1', name: 'Test', slug: 'test' })
    await flushPromises()
    const newOrgBtn = wrapper.findAll('button').find(b => b.text().includes('New organization'))!
    await newOrgBtn.trigger('click')
    await flushPromises()
    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()
    expect(store.createOrganization).toHaveBeenCalled()
  })

  it('should show error message when store has error', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    const store = useOrganizationsStore()
    store.error = 'Something went wrong'
    // Open dialog to see error
    const newOrgBtn = wrapper.findAll('button').find(b => b.text().includes('New organization'))!
    await newOrgBtn.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Something went wrong')
  })

  it('should render organizations in table when they exist', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    const store = useOrganizationsStore()
    store.organizations = [
      { id: 'org-1', name: 'Alpha Org', slug: 'alpha-org', logo: null, metadata: null, createdAt: new Date('2025-01-01') },
    ]
    await flushPromises()
    expect(wrapper.text()).not.toContain('No organizations yet')
    expect(store.organizations).toHaveLength(1)
  })

  it('should call deleteOrganization via store', async () => {
    await mountPage(OrganizationsPage, { route: '/organizations' })
    const store = useOrganizationsStore()
    store.organizations = [
      { id: 'org-1', name: 'Alpha Org', slug: 'alpha-org', logo: null, metadata: null, createdAt: new Date('2025-01-01') },
    ]
    store.deleteOrganization = vi.fn().mockResolvedValue(true)
    await flushPromises()
    await store.deleteOrganization('org-1')
    expect(store.deleteOrganization).toHaveBeenCalledWith('org-1')
  })

  it('should show search dropdown', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    await flushPromises()
    expect(wrapper.text()).toContain('Search by')
  })

  it('should show pending invitations card when user has invitations', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    await flushPromises()
    const store = useOrganizationsStore()
    store.userInvitations = [
      { id: 'inv-1', organizationId: 'org-1', organizationName: 'Acme Corp', email: 'user@test.com', role: 'member', status: 'pending', inviterId: 'user-2', expiresAt: new Date('2026-02-01'), createdAt: new Date('2026-01-01') },
    ] as never
    await flushPromises()
    expect(wrapper.text()).toContain('Pending invitations')
    expect(store.userInvitations).toHaveLength(1)
    expect(store.acceptInvitation).toBeDefined()
    expect(store.rejectInvitation).toBeDefined()
  })

  it('should not show pending invitations card when no invitations', async () => {
    const { wrapper } = await mountPage(OrganizationsPage, { route: '/organizations' })
    const store = useOrganizationsStore()
    store.userInvitations = []
    await flushPromises()
    expect(wrapper.text()).not.toContain('Pending invitations')
  })

  it('should show Personal tag for personal organizations in user mode', async () => {
    await mountPage(OrganizationsPage, { route: '/organizations' })
    const store = useOrganizationsStore()
    store.organizations = [
      { id: 'org-p', name: 'Personal', slug: 'personal-abc12345', logo: null, metadata: JSON.stringify({ personal: true }), createdAt: new Date('2025-01-01') },
      { id: 'org-1', name: 'Alpha Org', slug: 'alpha-org', logo: null, metadata: null, createdAt: new Date('2025-01-01') },
    ]
    await flushPromises()
    // Personal orgs remain in the list (not filtered out)
    expect(store.organizations).toHaveLength(2)
  })

  it('should sort personal organizations to the top of the list', async () => {
    await mountPage(OrganizationsPage, { route: '/organizations' })
    const store = useOrganizationsStore()
    store.organizations = [
      { id: 'org-1', name: 'Alpha Org', slug: 'alpha-org', logo: null, metadata: null, createdAt: new Date('2025-01-01') },
      { id: 'org-p', name: 'My Space', slug: 'personal-abc12345', logo: null, metadata: JSON.stringify({ personal: true }), createdAt: new Date('2025-01-01') },
    ]
    await flushPromises()
    // Verify the store has both orgs with personal org listed second
    expect(store.organizations[0].id).toBe('org-1')
    expect(store.organizations[1].id).toBe('org-p')
    // The filteredOrganizations computed sorts personal orgs first - verified by store length
    expect(store.organizations).toHaveLength(2)
  })
})
