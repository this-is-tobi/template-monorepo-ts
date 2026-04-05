import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'
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
  /** Restrict the key to specific organizations (empty = unrestricted). */
  organizationIds?: string[]
  /** Restrict the key to specific projects (empty = unrestricted). */
  projectIds?: string[]
}

/** Input for updating an existing API key. */
export interface UpdateApiKeyInput {
  permissions?: Record<string, string[]> | null
  /** Restrict the key to specific organizations (empty = unrestricted). */
  organizationIds?: string[]
  /** Restrict the key to specific projects (empty = unrestricted). */
  projectIds?: string[]
  name?: string
}

export const useApiKeysStore = defineStore('apiKeys', () => {
  const apiKeys = ref<ApiKeyEntry[]>([])
  const currentApiKey = ref<ApiKeyEntry | null>(null)
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
      const metadata: Record<string, unknown> = {}
      if (input.organizationIds && input.organizationIds.length > 0) {
        metadata.organizationIds = input.organizationIds
      }
      if (input.projectIds && input.projectIds.length > 0) {
        metadata.projectIds = input.projectIds
      }

      const { data, error: createError } = await authClient.apiKey.create({
        name: input.name,
        expiresIn: input.expiresIn,
        permissions: input.permissions,
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
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

  async function fetchApiKeyById(id: string) {
    loading.value = true
    error.value = null
    try {
      if (apiKeys.value.length === 0) {
        await fetchApiKeys()
      }
      currentApiKey.value = apiKeys.value.find(k => k.id === id) ?? null
      if (!currentApiKey.value) {
        error.value = 'API key not found'
      }
    } finally {
      loading.value = false
    }
  }

  async function updateApiKey(keyId: string, input: UpdateApiKeyInput) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.apiKeys.update(keyId, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
        ...(input.organizationIds !== undefined ? { organizationIds: input.organizationIds } : {}),
        ...(input.projectIds !== undefined ? { projectIds: input.projectIds } : {}),
      })
      await fetchApiKeys()
      currentApiKey.value = apiKeys.value.find(k => k.id === keyId) ?? data.data as unknown as ApiKeyEntry ?? null
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update API key'
      return false
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
    currentApiKey,
    loading,
    error,
    fetchApiKeys,
    fetchApiKeyById,
    createApiKey,
    updateApiKey,
    deleteApiKey,
  }
})
