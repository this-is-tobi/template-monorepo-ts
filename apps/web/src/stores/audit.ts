import type { AuditEntry, AuditQuery } from '@template-monorepo-ts/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

export type { AuditEntry, AuditQuery }

export const useAuditStore = defineStore('audit', () => {
  const entries = ref<AuditEntry[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchLogs(query?: Partial<AuditQuery>) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.audit.getLogs(query)
      entries.value = data.data
      total.value = data.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch audit logs'
    } finally {
      loading.value = false
    }
  }

  return {
    entries,
    total,
    loading,
    error,
    fetchLogs,
  }
})
