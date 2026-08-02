import type { AppConfig } from '@template-monorepo-ts/shared'
import { AppConfigSchema } from '@template-monorepo-ts/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

export const useConfigStore = defineStore('config', () => {
  // Derived from the schema so the pre-fetch fallback cannot drift from the
  // server's own defaults when a setting is added.
  const config = ref<AppConfig>(AppConfigSchema.parse({}))
  const ssoProviders = ref<string[]>([])
  // Optimistic: on a failed fetch the login page still offers the credentials
  // form, which is the only way in on a default install. Hiding it would turn
  // a transient API blip into a locked door.
  const emailPasswordEnabled = ref(true)
  const lockedFields = ref<string[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function fetchConfig() {
    loading.value = true
    try {
      const res = await apiClient.config.get()
      config.value = res.data.data
      ssoProviders.value = res.data.ssoProviders ?? []
      emailPasswordEnabled.value = res.data.emailPasswordEnabled ?? true
      lockedFields.value = res.data.lockedFields ?? []
      loaded.value = true
    } catch (error) {
      console.warn('Failed to fetch app configuration, using defaults', error)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  return { config, ssoProviders, emailPasswordEnabled, lockedFields, loaded, loading, fetchConfig }
})
