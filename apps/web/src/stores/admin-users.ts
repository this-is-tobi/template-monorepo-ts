import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'
import { authClient } from '~/lib/auth'

export interface AdminUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  role?: string | null
  banned?: boolean | null
  banReason?: string | null
  banExpires?: number | null
  createdAt: Date
  updatedAt: Date
}

export interface AdminUserDetail extends AdminUser {
  memberships: { id: string, role: string, createdAt: string, organization: { id: string, name: string, slug: string } }[]
  projects: { id: string, name: string, description?: string | null, createdAt: string }[]
  apiKeys: { id: string, name?: string | null, start?: string | null, enabled: boolean, permissions?: string | null, expiresAt?: string | null, createdAt: string }[]
}

/** Role marking a `user` row as a project's machine identity, not a person. */
export const SERVICE_ACCOUNT_ROLE = 'service'

/** Whether a listed user is a project's machine identity. */
export function isServiceAccount(user: Pick<AdminUser, 'role'>): boolean {
  return user.role === SERVICE_ACCOUNT_ROLE
}

export interface AdminUserQuery {
  limit?: number
  offset?: number
  searchField?: 'email' | 'name' | 'id'
  searchValue?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  /**
   * Include project service accounts. Off by default: they are machine
   * identities, and mixing them into the people list inflates every count an
   * administrator reads as "users".
   */
  includeServiceAccounts?: boolean
}

export const useAdminUsersStore = defineStore('adminUsers', () => {
  const users = ref<AdminUser[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers(query?: AdminUserQuery) {
    loading.value = true
    error.value = null
    const searchingById = query?.searchField === 'id' && !!query?.searchValue
    try {
      const { data, error: apiError } = await authClient.admin.listUsers({
        query: {
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
          // BetterAuth accepts a single `filterField`, so an id lookup and the
          // service-account exclusion cannot both apply. The id search wins:
          // asking for one specific row should return it, service or not —
          // the list badges what it is.
          ...(searchingById
            ? { filterField: 'id', filterValue: query!.searchValue!, filterOperator: 'contains' as const }
            : query?.includeServiceAccounts
              ? {}
              // Excluded server-side rather than after the fact, so `total`
              // and the page size stay honest.
              : { filterField: 'role', filterValue: SERVICE_ACCOUNT_ROLE, filterOperator: 'ne' as const }),
          ...(query?.searchField && query?.searchValue && query.searchField !== 'id'
            ? { searchField: query.searchField, searchValue: query.searchValue, searchOperator: 'contains' as const }
            : {}),
          sortBy: query?.sortBy ?? 'createdAt',
          sortDirection: query?.sortDirection ?? 'desc',
        },
      })
      if (apiError) {
        error.value = apiError.message ?? 'Failed to fetch users'
        return
      }
      users.value = data?.users as AdminUser[] ?? []
      total.value = data?.total ?? 0
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch users'
    } finally {
      loading.value = false
    }
  }

  async function setRole(userId: string, role: 'admin' | 'user') {
    loading.value = true
    error.value = null
    try {
      const { error: apiError } = await authClient.admin.setRole({
        userId,
        role,
      })
      if (apiError) {
        error.value = apiError.message ?? 'Failed to update role'
        return false
      }
      const user = users.value.find(u => u.id === userId)
      if (user) user.role = role
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update role'
      return false
    } finally {
      loading.value = false
    }
  }

  async function banUser(userId: string, banReason?: string) {
    loading.value = true
    error.value = null
    try {
      const { error: apiError } = await authClient.admin.banUser({
        userId,
        ...(banReason ? { banReason } : {}),
      })
      if (apiError) {
        error.value = apiError.message ?? 'Failed to ban user'
        return false
      }
      const user = users.value.find(u => u.id === userId)
      if (user) {
        user.banned = true
        user.banReason = banReason ?? null
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to ban user'
      return false
    } finally {
      loading.value = false
    }
  }

  async function unbanUser(userId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: apiError } = await authClient.admin.unbanUser({
        userId,
      })
      if (apiError) {
        error.value = apiError.message ?? 'Failed to unban user'
        return false
      }
      const user = users.value.find(u => u.id === userId)
      if (user) {
        user.banned = false
        user.banReason = null
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to unban user'
      return false
    } finally {
      loading.value = false
    }
  }

  const currentUser = ref<AdminUserDetail | null>(null)

  async function fetchUserById(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.admin.getUserById(id)
      currentUser.value = data.data as unknown as AdminUserDetail
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch user'
      currentUser.value = null
    } finally {
      loading.value = false
    }
  }

  return { users, total, loading, error, fetchUsers, setRole, banUser, unbanUser, currentUser, fetchUserById }
})
