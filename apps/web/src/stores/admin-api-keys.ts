import type { AdminApiKey, AdminApiKeyQuery } from '@template-monorepo-ts/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

export const useAdminApiKeysStore = defineStore('adminApiKeys', () => {
  const apiKeys = ref<AdminApiKey[]>([])
  const currentApiKey = ref<AdminApiKey | null>(null)
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchApiKeys(query?: Partial<AdminApiKeyQuery>) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.admin.getApiKeys(query)
      apiKeys.value = data.data
      total.value = data.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch API keys'
    } finally {
      loading.value = false
    }
  }

  async function fetchApiKeyById(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.admin.getApiKeyById(id)
      currentApiKey.value = data.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch API key'
    } finally {
      loading.value = false
    }
  }

  return { apiKeys, currentApiKey, total, loading, error, fetchApiKeys, fetchApiKeyById }
})
