import type { AdminUserDetail } from '~/stores/admin-users'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useAdminUsersStore } from '~/stores/admin-users'
import { mountPage } from '~/test/helpers'
import UserDetailPage from './UserDetailPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    admin: {
      getUsers: vi.fn(),
      getUserById: vi.fn().mockResolvedValue({ data: { data: null } }),
      setRole: vi.fn(),
      banUser: vi.fn(),
      unbanUser: vi.fn(),
    },
  },
}))

const mockUserDetail: AdminUserDetail = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  banned: false,
  banReason: null,
  emailVerified: true,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  memberships: [
    {
      id: 'mem-1',
      role: 'member',
      createdAt: '2025-01-02T00:00:00.000Z',
      organization: { id: 'org-1', name: 'Test Org', slug: 'test-org' },
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'My Project',
      description: 'A project',
      createdAt: '2025-01-03T00:00:00.000Z',
    },
  ],
  apiKeys: [
    {
      id: 'key-1',
      name: 'My Key',
      start: 'tm_abc',
      enabled: true,
      permissions: null,
      expiresAt: null,
      createdAt: '2025-01-04T00:00:00.000Z',
    },
  ],
}

describe('userDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    await flushPromises()
    const store = useAdminUsersStore()
    store.loading = true
    store.currentUser = null
    await nextTick()
    expect(wrapper.text()).toContain('Loading...')
  })

  it('should display user name and email', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    const store = useAdminUsersStore()
    store.currentUser = { ...mockUserDetail }
    await flushPromises()
    expect(wrapper.text()).toContain('Test User')
    expect(wrapper.text()).toContain('test@example.com')
  })

  it('should show error message on failure', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    await flushPromises()
    const store = useAdminUsersStore()
    store.error = 'User not found'
    store.currentUser = null
    await nextTick()
    expect(wrapper.text()).toContain('User not found')
  })

  it('should display user details in the details tab', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    const store = useAdminUsersStore()
    store.currentUser = { ...mockUserDetail }
    await flushPromises()
    expect(wrapper.text()).toContain('user-1')
    expect(wrapper.text()).toContain('User information')
  })

  it('should display tab headers with counts', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    const store = useAdminUsersStore()
    store.currentUser = { ...mockUserDetail }
    await flushPromises()
    expect(wrapper.text()).toContain('Details')
    expect(wrapper.text()).toContain('Organizations (1)')
    expect(wrapper.text()).toContain('Projects (1)')
    expect(wrapper.text()).toContain('API keys (1)')
  })

  it('should display organizations tab with count', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    const store = useAdminUsersStore()
    store.currentUser = { ...mockUserDetail }
    await flushPromises()
    expect(wrapper.text()).toContain('Organizations (1)')
  })

  it('should display projects tab with count', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    const store = useAdminUsersStore()
    store.currentUser = { ...mockUserDetail }
    await flushPromises()
    expect(wrapper.text()).toContain('Projects (1)')
  })

  it('should display api keys tab with count', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    const store = useAdminUsersStore()
    store.currentUser = { ...mockUserDetail }
    await flushPromises()
    expect(wrapper.text()).toContain('API keys (1)')
  })

  it('should show ban reason when user is banned', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    const store = useAdminUsersStore()
    store.currentUser = { ...mockUserDetail, banned: true, banReason: 'Violated terms' }
    await flushPromises()
    expect(wrapper.text()).toContain('Banned')
    expect(wrapper.text()).toContain('Violated terms')
  })

  it('should have back button to users list', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    const store = useAdminUsersStore()
    store.currentUser = { ...mockUserDetail }
    await flushPromises()
    expect(wrapper.text()).toContain('All users')
  })

  it('should show Change role and Ban buttons for active user', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    const store = useAdminUsersStore()
    store.currentUser = { ...mockUserDetail, banned: false }
    await flushPromises()
    expect(wrapper.text()).toContain('Change role')
    expect(wrapper.text()).toContain('Ban')
  })

  it('should show Unban button for banned user', async () => {
    const { wrapper } = await mountPage(UserDetailPage, { route: '/settings/admin/users/user-1' })
    const store = useAdminUsersStore()
    store.currentUser = { ...mockUserDetail, banned: true, banReason: 'spam' }
    await flushPromises()
    expect(wrapper.text()).toContain('Unban')
    expect(wrapper.text()).not.toContain('Ban user')
  })
})
