<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { computed, onMounted } from 'vue'
import RelativeTime from '~/components/RelativeTime.vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { isWithinDays } from '~/lib/format'
import { useApiKeysStore } from '~/stores/api-keys'

const EXPIRY_WINDOW_DAYS = 7

const apiKeysStore = useApiKeysStore()

onMounted(() => apiKeysStore.fetchApiKeys())

const expiring = computed(() =>
  apiKeysStore.apiKeys.filter(key => key.enabled && isWithinDays(key.expiresAt, EXPIRY_WINDOW_DAYS)),
)
</script>

<template>
  <!-- Only appears when action is actually needed. -->
  <Card v-if="expiring.length > 0" class="border-amber-500/40">
    <CardHeader class="flex-row items-center justify-between space-y-0">
      <CardTitle class="flex items-center gap-2 text-base text-amber-600 dark:text-amber-400">
        <TriangleAlert :size="16" />
        Keys expiring soon
      </CardTitle>
      <RouterLink class="text-sm text-[var(--primary)] hover:underline" to="/api-keys">
        Manage
      </RouterLink>
    </CardHeader>
    <CardContent>
      <ul class="flex flex-col divide-y divide-[var(--app-border)]">
        <li
          v-for="key in expiring"
          :key="key.id"
          class="flex items-center justify-between gap-4 py-2 text-sm"
        >
          <RouterLink
            :to="`/api-keys/${key.id}`"
            class="min-w-0 truncate text-[var(--app-fg)] hover:text-[var(--primary)]"
          >
            {{ key.name ?? key.prefix ?? 'Unnamed key' }}
          </RouterLink>
          <span class="shrink-0 text-xs text-amber-600 dark:text-amber-400">
            expires <RelativeTime :value="key.expiresAt" />
          </span>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
