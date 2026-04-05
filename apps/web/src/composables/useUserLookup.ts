import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authClient } from '~/lib/auth'

interface UserInfo {
  id: string
  name: string
  email: string
  image?: string | null
}

/**
 * Composable that caches user ID → {name, email} lookups.
 * Uses BetterAuth admin API — only works for admin users.
 */
export const useUserLookup = defineStore('userLookup', () => {
  const cache = ref<Map<string, UserInfo>>(new Map())
  const pending = ref<Set<string>>(new Set())

  function getUser(id: string): UserInfo | undefined {
    return cache.value.get(id)
  }

  function getUserName(id: string): string {
    return cache.value.get(id)?.name ?? id
  }

  function getUserEmail(id: string): string | undefined {
    return cache.value.get(id)?.email
  }

  /**
   * Resolve a batch of user IDs. Fetches missing ones from the admin API.
   * Already-cached IDs are skipped.
   */
  async function resolveUsers(ids: string[]) {
    const missing = ids.filter(id => id && !cache.value.has(id) && !pending.value.has(id))
    if (missing.length === 0) return

    for (const id of missing) {
      pending.value.add(id)
    }

    try {
      // Fetch a large page of users — this covers most cases.
      // BetterAuth admin API doesn't support "where ID in [...]", so we
      // fetch a generous page and cache everything we get.
      const { data } = await authClient.admin.listUsers({
        query: { limit: 200, offset: 0, sortBy: 'createdAt', sortDirection: 'desc' },
      })

      if (data?.users) {
        for (const user of data.users) {
          cache.value.set(user.id, {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
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

  /** Populate cache from an existing user list (e.g. from admin users store). */
  function populateFrom(users: Array<{ id: string, name: string, email: string, image?: string | null }>) {
    for (const user of users) {
      cache.value.set(user.id, user)
    }
  }

  return { cache, getUser, getUserName, getUserEmail, resolveUsers, populateFrom }
})
