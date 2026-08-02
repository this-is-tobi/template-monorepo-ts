<script setup lang="ts">
import type { AuditEntry } from '@template-monorepo-ts/shared'
import { onMounted, ref } from 'vue'
import RelativeTime from '~/components/RelativeTime.vue'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { apiClient } from '~/lib/api'

const LIMIT = 6

/**
 * Local state rather than the shared audit store: this widget shows a fixed
 * "latest N" slice and must not clobber the filtered/paginated result set the
 * audit log page keeps in that store.
 */
const entries = ref<AuditEntry[]>([])
const loading = ref(true)
const failed = ref(false)

onMounted(async () => {
  try {
    const { data } = await apiClient.audit.getLogs({ limit: LIMIT, offset: 0 })
    entries.value = data.data
  } catch {
    // Audit is an optional module (MODULES__AUDIT) and reads need
    // `audit:read` — treat any failure as "nothing to show" rather than
    // breaking the dashboard.
    failed.value = true
  } finally {
    loading.value = false
  }
})

/** `project:create` → `create`, so the verb reads first in the sentence. */
function verb(action: string): string {
  return action.includes(':') ? action.slice(action.indexOf(':') + 1) : action
}

function badgeVariant(action: string) {
  if (/delete|remove|revoke/.test(action)) return 'destructive' as const
  if (/create|add|accept/.test(action)) return 'success' as const
  if (/update|change/.test(action)) return 'warning' as const
  return 'secondary' as const
}
</script>

<template>
  <Card v-if="!failed">
    <CardHeader class="flex-row items-center justify-between space-y-0">
      <CardTitle class="text-base">
        Recent activity
      </CardTitle>
      <RouterLink class="text-sm text-[var(--primary)] hover:underline" to="/settings/audit">
        View all
      </RouterLink>
    </CardHeader>
    <CardContent>
      <p v-if="loading" class="text-sm text-[var(--app-muted)]">
        Loading activity…
      </p>
      <p v-else-if="entries.length === 0" class="text-sm text-[var(--app-muted)]">
        No recorded activity yet.
      </p>
      <ul v-else class="flex flex-col divide-y divide-[var(--app-border)]">
        <li
          v-for="entry in entries"
          :key="entry.id"
          class="flex items-center justify-between gap-3 py-2 text-sm"
        >
          <div class="flex min-w-0 items-center gap-2">
            <Badge :variant="badgeVariant(entry.action)" class="shrink-0">
              {{ verb(entry.action) }}
            </Badge>
            <span class="truncate text-[var(--app-fg)]">{{ entry.resourceType }}</span>
          </div>
          <RelativeTime
            :value="entry.createdAt"
            class="shrink-0 text-xs text-[var(--app-muted)]"
          />
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
