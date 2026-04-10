import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authClient } from '~/lib/auth'

export interface OrgRole {
  id: string
  organizationId: string
  role: string
  permission: Record<string, string[]>
  createdAt: Date
  updatedAt?: Date
}

/**
 * BetterAuth's dynamicAccessControl endpoints are not typed on the
 * organizationClient plugin — they're only available when the server
 * enables them. We use `$fetch` to call them directly.
 */
async function orgRoleFetch<T>(path: string, options?: { method?: string, body?: Record<string, unknown>, query?: Record<string, string> }) {
  const res = await authClient.$fetch<T>(path, {
    method: options?.method ?? 'GET',
    body: options?.body,
    query: options?.query,
  })
  return res
}

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<OrgRole[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRoles(organizationId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await orgRoleFetch<OrgRole[]>(
        '/organization/list-roles',
        { query: { organizationId } },
      )
      if (fetchError) {
        error.value = fetchError.message ?? 'Failed to fetch roles'
      } else {
        roles.value = data ?? []
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch roles'
    } finally {
      loading.value = false
    }
  }

  async function createRole(organizationId: string, role: string, permission: Record<string, string[]>) {
    loading.value = true
    error.value = null
    try {
      const { data, error: createError } = await orgRoleFetch<{ success: boolean, roleData: OrgRole }>(
        '/organization/create-role',
        { method: 'POST', body: { organizationId, role, permission } },
      )
      if (createError) {
        error.value = createError.message ?? 'Failed to create role'
        return null
      }
      const created = data?.roleData
      if (created) roles.value.push(created)
      return created ?? null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create role'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateRole(
    organizationId: string,
    roleId: string,
    payload: { permission?: Record<string, string[]>, roleName?: string },
  ) {
    loading.value = true
    error.value = null
    try {
      const { data: updated, error: updateError } = await orgRoleFetch<{ success: boolean, roleData: OrgRole }>(
        '/organization/update-role',
        { method: 'POST', body: { organizationId, roleId, data: payload } },
      )
      if (updateError) {
        error.value = updateError.message ?? 'Failed to update role'
        return null
      }
      const roleData = updated?.roleData
      if (roleData) {
        const idx = roles.value.findIndex(r => r.id === roleId)
        if (idx !== -1) roles.value[idx] = roleData
      }
      return roleData ?? null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update role'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteRole(organizationId: string, roleId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await orgRoleFetch<{ success: boolean }>(
        '/organization/delete-role',
        { method: 'POST', body: { organizationId, roleId } },
      )
      if (deleteError) {
        error.value = deleteError.message ?? 'Failed to delete role'
        return false
      }
      roles.value = roles.value.filter(r => r.id !== roleId)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete role'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    roles,
    loading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
  }
})
