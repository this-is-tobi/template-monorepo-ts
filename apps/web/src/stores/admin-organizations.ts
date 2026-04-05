import type { AdminOrganization, AdminOrganizationQuery } from '@template-monorepo-ts/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

export interface AdminOrganizationMember {
  id: string
  userId: string
  role: string
  createdAt: string
  user: { id: string, name: string, email: string, image?: string | null }
}

export interface AdminOrganizationInvitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
}

export interface AdminOrganizationDetail extends AdminOrganization {
  members: AdminOrganizationMember[]
  invitations: AdminOrganizationInvitation[]
}

export const useAdminOrganizationsStore = defineStore('adminOrganizations', () => {
  const organizations = ref<AdminOrganization[]>([])
  const currentOrganization = ref<AdminOrganizationDetail | null>(null)
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

  async function fetchOrganizationById(id: string) {
    loading.value = true
    error.value = null
    currentOrganization.value = null
    try {
      const { data } = await apiClient.admin.getOrganizationById(id)
      currentOrganization.value = data.data as AdminOrganizationDetail
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch organization'
    } finally {
      loading.value = false
    }
  }

  return { organizations, currentOrganization, total, loading, error, fetchOrganizations, fetchOrganizationById }
})
