import type { AppConfig } from '@template-monorepo-ts/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

export const useConfigStore = defineStore('config', () => {
  const config = ref<AppConfig>({
    enableRegistration: true,
    allowOrganizationCreation: true,
    appName: 'Template Monorepo TS',
    documentationUrl: '',
    maintenanceMode: false,
    maxOrganizationsPerUser: null,
  })
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
    } catch (error) {
      console.warn('Failed to fetch app configuration, using defaults', error)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  return { config, ssoProviders, loaded, loading, fetchConfig }
})
