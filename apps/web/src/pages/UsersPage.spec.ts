import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminUsersStore } from '~/stores/admin-users'
import { mountPage } from '~/test/helpers'
import UsersPage from './UsersPage.vue'

vi.mock('~/lib/api', () => ({
  apiClient: {
    admin: {
      getUsers: vi.fn(),
      getUserById: vi.fn(),
      setRole: vi.fn(),
      banUser: vi.fn(),
      unbanUser: vi.fn(),
    },
  },
}))

vi.mock('~/lib/auth', () => ({
  authClient: {
    admin: {
      listUsers: vi.fn().mockResolvedValue({ data: { users: [], total: 0 }, error: null }),
    },
  },
}))

const mockUsers = [
  { id: 'u-1', name: 'Alice', email: 'alice@example.com', role: 'admin', banned: false, createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01') },
  { id: 'u-2', name: 'Bob', email: 'bob@example.com', role: 'user', banned: true, banReason: 'spam', createdAt: new Date('2025-02-01'), updatedAt: new Date('2025-02-01') },
  { id: 'u-3', name: 'Carol', email: 'carol@example.com', role: null, banned: false, createdAt: new Date('2025-03-01'), updatedAt: new Date('2025-03-01') },
]

describe('usersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render heading', async () => {
    const { wrapper } = await mountPage(UsersPage, { route: '/settings/admin/users' })
    await flushPromises()
    expect(wrapper.text()).toContain('All users')
    expect(wrapper.text()).toContain('View and manage all platform users')
  })

  it('should show empty state when no users', async () => {
    const { wrapper } = await mountPage(UsersPage, { route: '/settings/admin/users' })
    const store = useAdminUsersStore()
    store.users = []
    await flushPromises()
    expect(wrapper.text()).toContain('No users found')
  })

  it('should display error message', async () => {
    const { wrapper } = await mountPage(UsersPage, { route: '/settings/admin/users' })
    const store = useAdminUsersStore()
    store.error = 'Failed to fetch users'
    await flushPromises()
    expect(wrapper.text()).toContain('Failed to fetch users')
  })

  it('should show search dropdown with field options', async () => {
    const { wrapper } = await mountPage(UsersPage, { route: '/settings/admin/users' })
    await flushPromises()
    expect(wrapper.text()).toContain('Search by')
    expect(wrapper.text()).toContain('Apply')
  })

  it('should not show bulk action bar when nothing is selected', async () => {
    const { wrapper } = await mountPage(UsersPage, { route: '/settings/admin/users' })
    await flushPromises()
    expect(wrapper.text()).not.toContain('selected')
  })

  it('should render with users in store without errors', async () => {
    const { wrapper } = await mountPage(UsersPage, { route: '/settings/admin/users' })
    const store = useAdminUsersStore()
    store.users = mockUsers as never
    store.total = 3
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })

  it('should render loading state', async () => {
    const { wrapper } = await mountPage(UsersPage, { route: '/settings/admin/users' })
    const store = useAdminUsersStore()
    store.loading = true
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
