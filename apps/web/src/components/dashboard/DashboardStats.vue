<script setup lang="ts">
import { Building2, FolderKanban, KeyRound } from 'lucide-vue-next'
import { computed, onMounted, watch } from 'vue'
import { Card, CardContent } from '~/components/ui/card'
import { useActiveOrg } from '~/composables/useActiveOrg'
import { useApiKeysStore } from '~/stores/api-keys'
import { useConfigStore } from '~/stores/config'
import { useOrganizationsStore } from '~/stores/organizations'
import { useProjectsStore } from '~/stores/projects'

const projectsStore = useProjectsStore()
const organizationsStore = useOrganizationsStore()
const apiKeysStore = useApiKeysStore()
const configStore = useConfigStore()
const { activeOrgId } = useActiveOrg()

/** Projects are scoped to the org selected in the header switcher. */
watch(activeOrgId, (orgId) => {
  projectsStore.fetchProjects({ limit: 5, ...(orgId ? { organizationId: orgId } : {}) })
}, { immediate: true })

onMounted(() => {
  organizationsStore.fetchOrganizations()
  apiKeysStore.fetchApiKeys()
})

const activeKeys = computed(() => apiKeysStore.apiKeys.filter(k => k.enabled).length)

interface Stat {
  label: string
  value: number
  /** Quota ceiling, when the platform enforces one. */
  max?: number | null
  hint?: string
  to: string
  icon: typeof FolderKanban
}

const stats = computed<Stat[]>(() => [
  {
    label: 'Projects',
    value: projectsStore.total ?? 0,
    max: configStore.config.maxProjectsPerOrg,
    to: '/projects',
    icon: FolderKanban,
  },
  {
    label: 'Organizations',
    value: organizationsStore.organizations.length,
    max: configStore.config.maxOrganizationsPerUser,
    to: '/organizations',
    icon: Building2,
  },
  {
    label: 'API keys',
    value: activeKeys.value,
    hint: `${apiKeysStore.apiKeys.length} total`,
    to: '/api-keys',
    icon: KeyRound,
  },
])

/** Percentage of quota consumed, or null when unlimited. */
function usage(stat: Stat): number | null {
  if (stat.max === null || stat.max === undefined || stat.max <= 0) return null
  return Math.min(100, Math.round((stat.value / stat.max) * 100))
}
</script>

<template>
  <!-- 2-up on phones so three counters don't cost three screens of scroll. -->
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
    <RouterLink
      v-for="stat in stats"
      :key="stat.label"
      :to="stat.to"
      class="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card class="card-hover h-full">
        <CardContent class="flex flex-col gap-2 p-5">
          <div class="flex items-center gap-2 text-[var(--app-muted)]">
            <component :is="stat.icon" :size="15" class="shrink-0" />
            <span class="text-xs font-medium uppercase tracking-wide">{{ stat.label }}</span>
          </div>

          <div class="flex items-baseline gap-1.5">
            <span class="text-3xl font-bold tabular-nums text-[var(--app-fg)]">{{ stat.value }}</span>
            <span v-if="stat.max" class="text-sm text-[var(--app-muted)]">/ {{ stat.max }}</span>
          </div>

          <!-- Quota bar only when a ceiling exists — otherwise the count is the whole story. -->
          <div
            v-if="usage(stat) !== null"
            class="h-1 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800"
          >
            <div
              class="h-full rounded-full transition-[width]"
              :class="usage(stat)! >= 90 ? 'bg-[var(--destructive)]' : 'bg-[var(--primary)]'"
              :style="{ width: `${usage(stat)}%` }"
            />
          </div>
          <p v-else-if="stat.hint" class="text-xs text-[var(--app-muted)]">
            {{ stat.hint }}
          </p>
        </CardContent>
      </Card>
    </RouterLink>
  </div>
</template>
