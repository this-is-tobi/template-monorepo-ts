<script setup lang="ts">
import type { RuntimeConfigEntry } from '@template-monorepo-ts/shared'
import { computed, onMounted, ref, watch } from 'vue'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { apiClient } from '~/lib/api'

/**
 * Read-only view of the configuration the server actually booted with.
 *
 * The point is answering "did my env var land?" without shell access to the
 * container. Nothing here is editable: these options are resolved once at
 * startup, so an input would be a lie — the runtime-editable tier lives in
 * Settings > General.
 *
 * Secrets are redacted server-side; this component never receives their
 * values, only whether one is configured.
 */
const props = defineProps<{
  /**
   * Bump to refetch. A plain prop rather than an exposed method, so the
   * parent's shared Refresh button does not depend on reaching into this
   * component's instance.
   */
  refreshToken?: number
}>()

const entries = ref<RuntimeConfigEntry[]>([])
const loading = ref(true)
const failed = ref(false)
const filter = ref('')

/** `server.rateLimit.max` → group `server`. */
function groupOf(entry: RuntimeConfigEntry): string {
  return entry.path.split('.')[0] ?? 'other'
}

const filtered = computed(() => {
  const needle = filter.value.trim().toLowerCase()
  if (!needle) return entries.value
  return entries.value.filter(entry =>
    entry.path.toLowerCase().includes(needle) || entry.envVar.toLowerCase().includes(needle),
  )
})

/** Grouped by top-level section, preserving the schema's declaration order. */
const groups = computed(() => {
  const byGroup = new Map<string, RuntimeConfigEntry[]>()
  for (const entry of filtered.value) {
    const group = groupOf(entry)
    const existing = byGroup.get(group)
    if (existing) existing.push(entry)
    else byGroup.set(group, [entry])
  }
  return [...byGroup].map(([name, items]) => ({ name, items }))
})

/** How many options an operator has explicitly set — the useful summary. */
const overriddenCount = computed(() => entries.value.filter(e => e.source !== 'default').length)

const sourceVariant: Record<RuntimeConfigEntry['source'], 'default' | 'secondary' | 'outline'> = {
  env: 'default',
  file: 'secondary',
  default: 'outline',
}

async function fetchRuntimeConfig() {
  loading.value = true
  failed.value = false
  try {
    const { data } = await apiClient.config.getRuntime()
    entries.value = data.entries
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchRuntimeConfig)
watch(() => props.refreshToken, fetchRuntimeConfig)
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h3 class="text-sm font-medium text-[var(--app-fg)]">
        Runtime configuration
      </h3>
      <p class="text-xs text-[var(--app-muted)]">
        Server options resolved at startup, and which layer set each one.
        Environment variables win over the config file, which wins over
        defaults. Changing these requires a redeploy — for settings you can
        change live, see <RouterLink to="/settings/general" class="underline underline-offset-2">
          General
        </RouterLink>.
        Secret values are never sent to the browser.
      </p>
    </div>

    <p v-if="failed" class="text-sm text-[var(--app-muted)]">
      Could not load the runtime configuration.
    </p>

    <template v-else-if="!loading">
      <div class="flex flex-wrap items-center gap-3">
        <Input
          v-model="filter"
          type="search"
          placeholder="Filter by name…"
          aria-label="Filter configuration options"
          class="max-w-xs"
        />
        <span class="text-xs text-[var(--app-muted)]">
          {{ overriddenCount }} of {{ entries.length }} options explicitly set
        </span>
      </div>

      <p v-if="groups.length === 0" class="text-sm text-[var(--app-muted)]">
        No option matches “{{ filter }}”.
      </p>

      <div v-for="group in groups" :key="group.name" class="flex flex-col gap-1">
        <h4 class="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]">
          {{ group.name }}
        </h4>
        <!-- Long option names and values must scroll here rather than push the page sideways. -->
        <div class="overflow-x-auto rounded-[var(--app-radius)] border border-[var(--app-border)]">
          <table class="w-full min-w-lg text-sm">
            <tbody>
              <tr
                v-for="entry in group.items"
                :key="entry.path"
                class="border-b border-[var(--app-border)] last:border-b-0"
              >
                <td class="px-3 py-2 align-top">
                  <span class="font-mono text-xs text-[var(--app-fg)]">{{ entry.envVar }}</span>
                  <span class="block text-xs text-[var(--app-muted)]">{{ entry.path }}</span>
                </td>
                <td class="px-3 py-2 align-top">
                  <span v-if="entry.secret" class="text-xs text-[var(--app-muted)]">
                    {{ entry.isSet ? '•••••••• (set)' : 'not set' }}
                  </span>
                  <span v-else-if="!entry.isSet" class="text-xs text-[var(--app-muted)]">
                    not set
                  </span>
                  <span v-else class="break-all font-mono text-xs text-[var(--app-fg)]">
                    {{ entry.value }}
                  </span>
                </td>
                <td class="px-3 py-2 text-right align-top">
                  <Badge :variant="sourceVariant[entry.source]" class="text-xs font-normal">
                    {{ entry.source }}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>
