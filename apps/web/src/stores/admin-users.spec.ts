import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminUsersStore } from './admin-users'

const mockListUsers = vi.fn()
const mockSetRole = vi.fn()
const mockBanUser = vi.fn()
const mockUnbanUser = vi.fn()

vi.mock('~/lib/auth', () => ({
  authClient: {
    admin: {
      listUsers: (...args: unknown[]) => mockListUsers(...args),
      setRole: (...args: unknown[]) => mockSetRole(...args),
      banUser: (...args: unknown[]) => mockBanUser(...args),
      unbanUser: (...args: unknown[]) => mockUnbanUser(...args),
    },
  },
}))

const mockUser = {
  id: 'u-1',
  name: 'Alice',
  email: 'alice@example.com',
  emailVerified: true,
  image: null,
  role: 'user',
  banned: false,
  banReason: null,
  banExpires: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

describe('useAdminUsersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should start with empty state', () => {
    const store = useAdminUsersStore()
    expect(store.users).toEqual([])
    expect(store.total).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchUsers', () => {
    it('should populate users on success', async () => {
      mockListUsers.mockResolvedValue({ data: { users: [mockUser], total: 1 } })
      const store = useAdminUsersStore()
      await store.fetchUsers()
      expect(store.users).toEqual([mockUser])
      expect(store.total).toBe(1)
      expect(store.loading).toBe(false)
    })

    it('should pass search parameters', async () => {
      mockListUsers.mockResolvedValue({ data: { users: [], total: 0 } })
      const store = useAdminUsersStore()
      await store.fetchUsers({ searchField: 'name', searchValue: 'Alice' })
      expect(mockListUsers).toHaveBeenCalledWith({
        query: expect.objectContaining({
          searchField: 'name',
          searchValue: 'Alice',
          searchOperator: 'contains',
        }),
      })
    })

    it('should use filterField for id search', async () => {
      mockListUsers.mockResolvedValue({ data: { users: [], total: 0 } })
      const store = useAdminUsersStore()
      await store.fetchUsers({ searchField: 'id', searchValue: 'abc-123' })
      expect(mockListUsers).toHaveBeenCalledWith({
        query: expect.objectContaining({
          filterField: 'id',
          filterValue: 'abc-123',
          filterOperator: 'contains',
        }),
      })
    })

    it('should set error on API error', async () => {
      mockListUsers.mockResolvedValue({ data: null, error: { message: 'Forbidden' } })
      const store = useAdminUsersStore()
      await store.fetchUsers()
      expect(store.error).toBe('Forbidden')
    })

    it('should set error on exception', async () => {
      mockListUsers.mockRejectedValue(new Error('Network error'))
      const store = useAdminUsersStore()
      await store.fetchUsers()
      expect(store.error).toBe('Network error')
    })
  })

  describe('setRole', () => {
    it('should update user role on success', async () => {
      mockListUsers.mockResolvedValue({ data: { users: [{ ...mockUser }], total: 1 } })
      mockSetRole.mockResolvedValue({ error: null })
      const store = useAdminUsersStore()
      await store.fetchUsers()

      const ok = await store.setRole('u-1', 'admin')
      expect(ok).toBe(true)
      expect(store.users[0].role).toBe('admin')
    })

    it('should set error on failure', async () => {
      mockSetRole.mockResolvedValue({ error: { message: 'Not allowed' } })
      const store = useAdminUsersStore()
      const ok = await store.setRole('u-1', 'admin')
      expect(ok).toBe(false)
      expect(store.error).toBe('Not allowed')
    })
  })

  describe('banUser', () => {
    it('should ban user on success', async () => {
      mockListUsers.mockResolvedValue({ data: { users: [{ ...mockUser }], total: 1 } })
      mockBanUser.mockResolvedValue({ error: null })
      const store = useAdminUsersStore()
      await store.fetchUsers()

      const ok = await store.banUser('u-1', 'Spam')
      expect(ok).toBe(true)
      expect(store.users[0].banned).toBe(true)
      expect(store.users[0].banReason).toBe('Spam')
    })

    it('should set error on failure', async () => {
      mockBanUser.mockResolvedValue({ error: { message: 'Failed' } })
      const store = useAdminUsersStore()
      const ok = await store.banUser('u-1')
      expect(ok).toBe(false)
      expect(store.error).toBe('Failed')
    })
  })

  describe('unbanUser', () => {
    it('should unban user on success', async () => {
      const bannedUser = { ...mockUser, banned: true, banReason: 'Spam' }
      mockListUsers.mockResolvedValue({ data: { users: [bannedUser], total: 1 } })
      mockUnbanUser.mockResolvedValue({ error: null })
      const store = useAdminUsersStore()
      await store.fetchUsers()

      const ok = await store.unbanUser('u-1')
      expect(ok).toBe(true)
      expect(store.users[0].banned).toBe(false)
      expect(store.users[0].banReason).toBeNull()
    })

    it('should set error on failure', async () => {
      mockUnbanUser.mockResolvedValue({ error: { message: 'Failed' } })
      const store = useAdminUsersStore()
      const ok = await store.unbanUser('u-1')
      expect(ok).toBe(false)
      expect(store.error).toBe('Failed')
    })
  })
})
