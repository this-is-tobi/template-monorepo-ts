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
})
