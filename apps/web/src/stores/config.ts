import type { AppConfig } from '@template-monorepo-ts/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

export const useConfigStore = defineStore('config', () => {
  const config = ref<AppConfig>({ enableRegistration: true })
  const ssoProviders = ref<string[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function fetchConfig() {
    loading.value = true
    try {
      const res = await apiClient.config.get()
      config.value = res.data.data
      ssoProviders.value = res.data.ssoProviders ?? []
      loaded.value = true
    } catch {
      // Keep defaults on failure — registration stays enabled
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  return { config, ssoProviders, loaded, loading, fetchConfig }
})
