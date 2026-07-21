import { computed } from 'vue'
import { authClient } from '~/lib/auth'

/**
 * Reactive access to the BetterAuth active organization.
 *
 * `activeOrgId` tracks the organization currently selected in the header
 * switcher and updates whenever it changes (via `organization.setActive`),
 * so org-scoped pages can simply `watch(activeOrgId, reload)` to refresh
 * their data on switch.
 */
export function useActiveOrg() {
  const activeOrg = authClient.useActiveOrganization()
  const activeOrgId = computed(() => activeOrg.value?.data?.id ?? null)
  return { activeOrg, activeOrgId }
}
