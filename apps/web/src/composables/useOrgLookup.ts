import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

interface OrgInfo {
  id: string
  name: string
  slug: string
}

/**
 * Composable that caches organization ID → {name, slug} lookups.
 * Uses the admin organizations API — only works for admin users.
 */
export const useOrgLookup = defineStore('orgLookup', () => {
  const cache = ref<Map<string, OrgInfo>>(new Map())
  const pending = ref<Set<string>>(new Set())

  function getOrg(id: string): OrgInfo | undefined {
    return cache.value.get(id)
  }

  function getOrgName(id: string): string {
    return cache.value.get(id)?.name ?? id
  }

  /**
   * Resolve a batch of organization IDs. Fetches missing ones from the admin API.
   * Already-cached IDs are skipped.
   */
  async function resolveOrgs(ids: string[]) {
    const missing = ids.filter(id => id && !cache.value.has(id) && !pending.value.has(id))
    if (missing.length === 0) return

    for (const id of missing) {
      pending.value.add(id)
    }

    try {
      const { data } = await apiClient.admin.getOrganizations({
        limit: 200,
        offset: 0,
      })

      if (data?.data) {
        for (const org of data.data) {
          cache.value.set(org.id, {
            id: org.id,
            name: org.name,
            slug: org.slug,
          })
        }
      }
    } catch {
      // Silently fail — IDs will show as-is
    } finally {
      for (const id of missing) {
        pending.value.delete(id)
      }
    }
  }

  return { cache, getOrg, getOrgName, resolveOrgs }
})
