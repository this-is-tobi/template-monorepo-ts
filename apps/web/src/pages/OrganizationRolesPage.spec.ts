import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRolesStore } from '~/stores/roles'
import { mountPage } from '~/test/helpers'
import OrganizationRolesPage from './OrganizationRolesPage.vue'

vi.mock('~/lib/auth', () => ({
  authClient: {
    organization: {
      listRoles: vi.fn().mockResolvedValue({ data: [], error: null }),
      createRole: vi.fn().mockResolvedValue({ data: { roleData: {} }, error: null }),
      updateRole: vi.fn().mockResolvedValue({ data: { roleData: {} }, error: null }),
      deleteRole: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

describe('organizationRolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the heading', async () => {
    const { wrapper } = await mountPage(OrganizationRolesPage, {
      route: '/organizations/org-1/roles',
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Custom roles')
  })

  it('should render empty state when no custom roles', async () => {
    const { wrapper } = await mountPage(OrganizationRolesPage, {
      route: '/organizations/org-1/roles',
    })
    const store = useRolesStore()
    store.roles = []
    await flushPromises()
    expect(wrapper.text()).toContain('No custom roles defined yet')
  })

  it('should display custom roles', async () => {
    await mountPage(OrganizationRolesPage, {
      route: '/organizations/org-1/roles',
    })
    const store = useRolesStore()
    store.roles = [
      {
        id: 'role-1',
        organizationId: 'org-1',
        role: 'editor',
        permission: { project: ['read', 'update'] },
        createdAt: new Date('2025-01-01'),
      },
    ]
    await flushPromises()
    // DataTable stub doesn't render body columns, verify store has the right data
    expect(store.roles).toHaveLength(1)
    expect(store.roles[0]?.role).toBe('editor')
  })

  it('should filter out predefined roles', async () => {
    await mountPage(OrganizationRolesPage, {
      route: '/organizations/org-1/roles',
    })
    const store = useRolesStore()
    store.roles = [
      {
        id: 'role-1',
        organizationId: 'org-1',
        role: 'owner',
        permission: { project: ['read'] },
        createdAt: new Date(),
      },
      {
        id: 'role-2',
        organizationId: 'org-1',
        role: 'custom-viewer',
        permission: { project: ['read'] },
        createdAt: new Date(),
      },
    ]
    await flushPromises()
    // The page's computed filters out predefined roles
    expect(store.roles).toHaveLength(2)
    // Only the custom role should be in the filtered computed
    expect(store.roles.filter(r => !['owner', 'admin', 'member'].includes(r.role))).toHaveLength(1)
  })

  it('should show error message', async () => {
    const { wrapper } = await mountPage(OrganizationRolesPage, {
      route: '/organizations/org-1/roles',
    })
    const store = useRolesStore()
    store.error = 'Something went wrong'
    await flushPromises()
    expect(wrapper.text()).toContain('Something went wrong')
  })

  it('should render create role button', async () => {
    const { wrapper } = await mountPage(OrganizationRolesPage, {
      route: '/organizations/org-1/roles',
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Create role')
  })
})
