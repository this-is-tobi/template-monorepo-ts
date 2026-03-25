import type { AdminOrganization, AdminOrganizationQuery } from '@template-monorepo-ts/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

export const useAdminOrganizationsStore = defineStore('adminOrganizations', () => {
  const organizations = ref<AdminOrganization[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOrganizations(query?: Partial<AdminOrganizationQuery>) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.admin.getOrganizations(query)
      organizations.value = data.data
      total.value = data.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch organizations'
    } finally {
      loading.value = false
    }
  }

  return { organizations, total, loading, error, fetchOrganizations }
})
