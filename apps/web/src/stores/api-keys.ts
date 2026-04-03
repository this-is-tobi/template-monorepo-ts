import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authClient } from '~/lib/auth'

/** Shape of an API key entry returned by BetterAuth. */
export interface ApiKeyEntry {
  id: string
  configId: string
  name: string | null
  start: string | null
  prefix: string | null
  referenceId: string
  permissions: Record<string, string[]> | null
  metadata: Record<string, unknown> | null
  enabled: boolean
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/** Input for creating a new API key. */
export interface CreateApiKeyInput {
  name: string
  expiresIn?: number
  permissions?: Record<string, string[]>
}

export const useApiKeysStore = defineStore('apiKeys', () => {
  const apiKeys = ref<ApiKeyEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchApiKeys() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await authClient.apiKey.list()
      if (fetchError) {
        error.value = fetchError.message ?? 'Failed to fetch API keys'
      } else {
        apiKeys.value = (data?.apiKeys ?? []) as ApiKeyEntry[]
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch API keys'
    } finally {
      loading.value = false
    }
  }

  async function createApiKey(input: CreateApiKeyInput) {
    loading.value = true
    error.value = null
    try {
      const { data, error: createError } = await authClient.apiKey.create({
        name: input.name,
        expiresIn: input.expiresIn,
        permissions: input.permissions,
      })
      if (createError) {
        error.value = createError.message ?? 'Failed to create API key'
        return null
      }
      await fetchApiKeys()
      return data as { key: string } | null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create API key'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteApiKey(keyId: string) {
    loading.value = true
    error.value = null
    try {
      const { error: deleteError } = await authClient.apiKey.delete({
        keyId,
      })
      if (deleteError) {
        error.value = deleteError.message ?? 'Failed to delete API key'
        return false
      }
      apiKeys.value = apiKeys.value.filter(k => k.id !== keyId)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete API key'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    apiKeys,
    loading,
    error,
    fetchApiKeys,
    createApiKey,
    deleteApiKey,
  }
})
