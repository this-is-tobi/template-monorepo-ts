import type { FullOrganization } from '~/stores/organizations'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuditStore } from '~/stores/audit'
import { useAuthStore } from '~/stores/auth'
import { useOrganizationsStore } from '~/stores/organizations'
import { useRolesStore } from '~/stores/roles'
import { mockUser, mountPage } from '~/test/helpers'
import OrganizationDetailPage from './OrganizationDetailPage.vue'

const { getOrgLogs } = vi.hoisted(() => ({
  getOrgLogs: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
}))

vi.mock('~/lib/api', () => ({
  apiClient: {
    audit: {
      getOrgLogs,
    },
  },
}))

vi.mock('~/lib/auth', () => ({
  authClient: {
    organization: {
      list: vi.fn(),
      getFullOrganization: vi.fn().mockResolvedValue({ data: null, error: null }),
      create: vi.fn(),
      update: vi.fn(),
      listRoles: vi.fn().mockResolvedValue({ data: [], error: null }),
      createRole: vi.fn().mockResolvedValue({ data: { roleData: {} }, error: null }),
      updateRole: vi.fn().mockResolvedValue({ data: { roleData: {} }, error: null }),
      deleteRole: vi.fn().mockResolvedValue({ error: null }),
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

const mockPersonalOrg: FullOrganization = {
  id: 'org-personal',
  name: 'Personal',
  slug: 'personal-abc12345',
  logo: null,
  metadata: JSON.stringify({ personal: true }),
  createdAt: new Date('2026-01-01'),
  members: [
    { id: 'member-p1', userId: 'user-1', organizationId: 'org-personal', role: 'owner', createdAt: new Date('2026-01-01'), user: { id: 'user-1', name: 'Test User', email: 'test@example.com', image: null } },
  ],
  invitations: [],
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

  it('should show invite and delete buttons for owner', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    expect(wrapper.text()).toContain('Invite member')
    expect(wrapper.text()).toContain('Settings')
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

  it('should show edit form in Settings tab for owner', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Save changes')
  })

  it('should show Roles tab for owner/admin', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    expect(wrapper.text()).toContain('Roles')
  })

  it('should hide Roles tab for regular member', async () => {
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
    expect(wrapper.text()).not.toContain('Roles (')
  })

  it('should show custom roles in Roles tab', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    const rolesStore = useRolesStore()
    rolesStore.roles = [
      { id: 'role-1', organizationId: 'org-1', role: 'editor', permission: { project: ['read', 'update'] }, createdAt: new Date('2025-01-01') },
    ]
    await flushPromises()
    expect(wrapper.text()).toContain('Roles (1)')
  })

  it('should show Create role button for owner/admin', async () => {
    const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const auth = useAuthStore()
    auth.user = { ...mockUser }
    const store = useOrganizationsStore()
    store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [...mockFullOrg.invitations] }
    await flushPromises()
    expect(wrapper.text()).toContain('Create role')
  })

  it('should initialize roles store on mount', async () => {
    await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
    const rolesStore = useRolesStore()
    // The roles store is initialized and its roles array is accessible
    expect(rolesStore.roles).toBeDefined()
  })

  describe('personal organization', () => {
    it('should hide Members tab for personal org', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-personal' })
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockPersonalOrg, members: [...mockPersonalOrg.members], invitations: [] }
      await flushPromises()
      expect(wrapper.text()).not.toContain('Members (')
    })

    it('should hide Invite member button for personal org', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-personal' })
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockPersonalOrg, members: [...mockPersonalOrg.members], invitations: [] }
      await flushPromises()
      expect(wrapper.text()).not.toContain('Invite member')
    })

    it('should hide Roles tab for personal org', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-personal' })
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockPersonalOrg, members: [...mockPersonalOrg.members], invitations: [] }
      await flushPromises()
      expect(wrapper.text()).not.toContain('Roles (')
    })

    it('should still show Details and Projects tabs for personal org', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-personal' })
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockPersonalOrg, members: [...mockPersonalOrg.members], invitations: [] }
      await flushPromises()
      expect(wrapper.text()).toContain('Details')
      expect(wrapper.text()).toContain('Projects')
    })

    it('should still show Settings tab for personal org owner', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-personal' })
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockPersonalOrg, members: [...mockPersonalOrg.members], invitations: [] }
      await flushPromises()
      expect(wrapper.text()).toContain('Settings')
    })

    it('should not redirect admin to user detail for personal org', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-personal' })
      const auth = useAuthStore()
      auth.user = { ...mockUser, role: 'admin' }
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockPersonalOrg, members: [...mockPersonalOrg.members], invitations: [] }
      await flushPromises()
      expect(wrapper.text()).toContain('Personal')
    })
  })

  describe('audit tab', () => {
    it('should show Audit tab for org owner', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [] }
      await flushPromises()
      expect(wrapper.text()).toContain('Audit')
    })

    it('should show Audit tab for org admin', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
      const auth = useAuthStore()
      auth.user = { id: 'user-2', email: 'admin@test.com', name: 'Admin Member', role: 'user' }
      const store = useOrganizationsStore()
      store.currentOrganization = {
        ...mockFullOrg,
        members: [
          { id: 'member-2', userId: 'user-2', organizationId: 'org-1', role: 'admin', createdAt: new Date('2026-01-01'), user: { id: 'user-2', name: 'Admin Member', email: 'admin@test.com', image: null } },
        ],
        invitations: [],
      }
      await flushPromises()
      expect(wrapper.text()).toContain('Audit')
    })

    it('should hide Audit tab for regular member', async () => {
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
      expect(wrapper.text()).not.toContain('Audit')
    })

    it('should show Audit tab for custom role with audit:read permission', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
      const auth = useAuthStore()
      auth.user = { id: 'user-4', email: 'auditor@test.com', name: 'Auditor', role: 'user' }
      const store = useOrganizationsStore()
      store.currentOrganization = {
        ...mockFullOrg,
        members: [
          { id: 'member-4', userId: 'user-4', organizationId: 'org-1', role: 'auditor', createdAt: new Date('2026-01-01'), user: { id: 'user-4', name: 'Auditor', email: 'auditor@test.com', image: null } },
        ],
        invitations: [],
      }
      const rolesStore = useRolesStore()
      rolesStore.roles = [
        { id: 'role-audit', organizationId: 'org-1', role: 'auditor', permission: { audit: ['read'] }, createdAt: new Date('2025-01-01') },
      ]
      await flushPromises()
      expect(wrapper.text()).toContain('Audit')
    })

    it('should hide Audit tab for custom role without audit:read permission', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
      const auth = useAuthStore()
      auth.user = { id: 'user-5', email: 'editor@test.com', name: 'Editor', role: 'user' }
      const store = useOrganizationsStore()
      store.currentOrganization = {
        ...mockFullOrg,
        members: [
          { id: 'member-5', userId: 'user-5', organizationId: 'org-1', role: 'editor', createdAt: new Date('2026-01-01'), user: { id: 'user-5', name: 'Editor', email: 'editor@test.com', image: null } },
        ],
        invitations: [],
      }
      const rolesStore = useRolesStore()
      rolesStore.roles = [
        { id: 'role-editor', organizationId: 'org-1', role: 'editor', permission: { project: ['read', 'update'] }, createdAt: new Date('2025-01-01') },
      ]
      await flushPromises()
      expect(wrapper.text()).not.toContain('Audit')
    })

    it('should call getOrgLogs when org loads with audit permission', async () => {
      await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [] }
      await flushPromises()
      expect(getOrgLogs).toHaveBeenCalledWith('org-1', expect.any(Object))
    })

    it('should not call getOrgLogs when org loads without audit permission', async () => {
      getOrgLogs.mockClear()
      await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
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
      expect(getOrgLogs).not.toHaveBeenCalled()
    })

    it('should show error from audit store in Audit tab', async () => {
      const { wrapper } = await mountPage(OrganizationDetailPage, { route: '/organizations/org-1' })
      const auth = useAuthStore()
      auth.user = { ...mockUser }
      const store = useOrganizationsStore()
      store.currentOrganization = { ...mockFullOrg, members: [...mockFullOrg.members], invitations: [] }
      await flushPromises()
      // Set error after initial load so fetchOrgLogs does not clear it
      const auditStoreInstance = useAuditStore()
      auditStoreInstance.error = 'Failed to load audit logs'
      await flushPromises()
      expect(wrapper.text()).toContain('Failed to load audit logs')
    })
  })
})
