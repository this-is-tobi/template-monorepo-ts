import type { FullOrganization } from '~/stores/organizations'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth'
import { useOrganizationsStore } from '~/stores/organizations'
import { mockUser, mountPage } from '~/test/helpers'
import OrganizationDetailPage from './OrganizationDetailPage.vue'

vi.mock('~/lib/auth', () => ({
  authClient: {
    organization: {
      list: vi.fn(),
      getFullOrganization: vi.fn().mockResolvedValue({ data: null, error: null }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      inviteMember: vi.fn(),
      removeMember: vi.fn(),
      updateMemberRole: vi.fn(),
      cancelInvitation: vi.fn(),
      acceptInvitation: vi.fn(),
      rejectInvitation: vi.fn(),
    },
  },
}))

const mockFullOrg: FullOrganization = {
  id: 'org-1',
  name: 'Test Org',
  slug: 'test-org',
  logo: null,
  metadata: null,
  createdAt: new Date('2026-01-01'),
  members: [
    { id: 'member-1', userId: 'user-1', organizationId: 'org-1', role: 'owner', createdAt: new Date('2026-01-01'), user: { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null } },
    { id: 'member-2', userId: 'user-2', organizationId: 'org-1', role: 'member', createdAt: new Date('2026-01-02'), user: { id: 'user-2', name: 'Member User', email: 'member@test.com', image: null } },
  ],
  invitations: [
    { id: 'inv-1', email: 'invited@test.com', organizationId: 'org-1', role: 'member', status: 'pending', inviterId: 'user-1', expiresAt: new Date('2026-02-01'), createdAt: new Date('2026-01-01') },
  ],
}

describe('organizationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const store = useOrganizationsStore()
    store.loading = true
    store.currentOrganization = null
    await flushPromises()
    expect(wrapper.text()).toContain('Loading...')
  })

  it('should display organization name and slug', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    expect(wrapper.text()).toContain('Test Org')
    expect(wrapper.text()).toContain('test-org')
  })

  it('should show error message on failure', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const store = useOrganizationsStore()
    store.error = 'Organization not found'
    store.currentOrganization = null
    await flushPromises()
    expect(wrapper.text()).toContain('Organization not found')
  })

  it('should have back to organizations button', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    expect(wrapper.text()).toContain('Organizations')
  })

  it('should show edit and invite buttons for owner', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    expect(wrapper.text()).toContain('Invite member')
    expect(wrapper.text()).toContain('Edit')
    expect(wrapper.text()).toContain('Delete')
  })

  it('should hide management buttons when user is regular member', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const auth = useAuthStore()
    auth.user = { id: 'user-3', email: 'other@test.com', name: 'Other', role: 'user' }
    const store = useOrganizationsStore()
    store.currentOrganization = {
      ...mockFullOrg,
      members: [
        { id: 'member-3', userId: 'user-3', organizationId: 'org-1', role: 'member', createdAt: new Date('2026-01-01'), user: { id: 'user-3', name: 'Other', email: 'other@test.com', image: null } },
      ],
      invitations: [],
    }
    await flushPromises()
    expect(wrapper.text()).not.toContain('Invite member')
    expect(wrapper.text()).not.toContain('Delete')
  })

  it('should show members section', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    expect(wrapper.text()).toContain('Members')
    expect(wrapper.text()).toContain('Details')
  })

  it('should show pending invitations section for owner/admin', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    expect(wrapper.text()).toContain('Pending invitations')
  })

  it('should open invite dialog when Invite member button is clicked', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    expect(wrapper.text()).not.toContain('Send an invitation')
    const inviteBtn = wrapper.findAll('button').find(b => b.text().includes('Invite member'))!
    await inviteBtn.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Send an invitation')
  })

  it('should open edit dialog when Edit button is clicked', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    const editBtn = wrapper.findAll('button').find(b => b.text() === 'Edit')!
    await editBtn.trigger('click')
    await flushPromises()
    // Edit dialog form should be visible
    expect(wrapper.findAll('form').length).toBeGreaterThan(0)
  })
})
