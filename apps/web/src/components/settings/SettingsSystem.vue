<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import SettingsRuntimeConfig from '~/components/settings/SettingsRuntimeConfig.vue'
import { Button } from '~/components/ui/button'
import { apiClient } from '~/lib/api'
import { APP_VERSION } from '~/lib/config'

const webVersion = APP_VERSION

const apiVersion = ref<string>()
const apiStatus = ref<'ok' | 'degraded' | 'loading'>('loading')

interface ComponentStatus {
  status: 'ok' | 'unavailable'
  message?: string
}

const components = ref<Record<string, ComponentStatus>>({})
const componentsLoading = ref(true)
const refreshing = ref(false)
/** Bumped to tell the runtime-config section to refetch. */
const refreshToken = ref(0)

const visibleComponents = computed(() =>
  Object.entries(components.value).map(([name, info]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    ...info,
  })),
)

async function fetchSystemInfo() {
  try {
    const { data } = await apiClient.system.getVersion()
    apiVersion.value = data?.version
  } catch {
    apiVersion.value = 'unavailable'
  }

  try {
    const { data } = await apiClient.system.getHealth()
    apiStatus.value = data?.status === 'OK' ? 'ok' : 'degraded'
  } catch {
    apiStatus.value = 'degraded'
  }

  try {
    const { data } = await apiClient.system.getReady()
    components.value = data?.components ?? {}
  } catch {
    components.value = {}
  } finally {
    componentsLoading.value = false
  }
}

/**
 * Service status is a point-in-time probe, so it needs a way to re-run —
 * otherwise an operator watching a dependency recover has to reload the whole
 * app to see it come back.
 */
async function refresh() {
  refreshing.value = true
  apiStatus.value = 'loading'
  componentsLoading.value = true
  refreshToken.value += 1
  try {
    await fetchSystemInfo()
  } finally {
    refreshing.value = false
  }
}

onMounted(fetchSystemInfo)
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold tracking-tight text-[var(--app-fg)]">
          System
        </h2>
        <p class="text-sm text-[var(--app-muted)]">
          Versions, service health, and the configuration this server booted with.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        :loading="refreshing"
        aria-label="Refresh system status"
        @click="refresh"
      >
        <RefreshCw :size="14" />
        Refresh
      </Button>
    </div>

    <!-- Versions -->
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-medium text-[var(--app-fg)]">
        Versions
      </h3>
      <div class="grid max-w-sm grid-cols-[auto_1fr] gap-x-8 gap-y-2">
        <span class="text-sm text-[var(--app-muted)]">Web</span>
        <span class="font-mono text-sm text-[var(--app-fg)]">{{ webVersion }}</span>
        <span class="text-sm text-[var(--app-muted)]">API</span>
        <span class="font-mono text-sm text-[var(--app-fg)]">{{ apiVersion ?? '...' }}</span>
      </div>
    </section>

    <div class="border-t border-border" />

    <!-- Service status -->
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-medium text-[var(--app-fg)]">
        Service status
      </h3>
      <div class="flex max-w-sm flex-col gap-2">
        <div class="flex items-center justify-between py-1">
          <span class="text-sm text-[var(--app-muted)]">API</span>
          <span class="flex items-center gap-1.5 text-sm">
            <span
              class="inline-block h-2 w-2 rounded-full"
              :class="apiStatus === 'ok' ? 'bg-green-500' : apiStatus === 'loading' ? 'bg-surface-400' : 'bg-red-500'"
            />
            {{ apiStatus === 'ok' ? 'Healthy' : apiStatus === 'loading' ? 'Checking...' : 'Degraded' }}
          </span>
        </div>
        <template v-if="componentsLoading">
          <div class="flex items-center justify-between py-1">
            <span class="text-sm text-[var(--app-muted)]">Components</span>
            <span class="flex items-center gap-1.5 text-sm">
              <span class="inline-block h-2 w-2 rounded-full bg-surface-400" />
              Checking...
            </span>
          </div>
        </template>
        <template v-else>
          <div
            v-for="comp in visibleComponents"
            :key="comp.name"
            class="flex items-center justify-between py-1"
          >
            <span class="text-sm text-[var(--app-muted)]">{{ comp.name }}</span>
            <span class="flex items-center gap-1.5 text-sm" :title="comp.message">
              <span
                class="inline-block h-2 w-2 rounded-full"
                :class="comp.status === 'ok' ? 'bg-green-500' : 'bg-red-500'"
              />
              {{ comp.status === 'ok' ? 'Healthy' : 'Unavailable' }}
            </span>
          </div>
        </template>
      </div>
    </section>

    <div class="border-t border-border" />

    <SettingsRuntimeConfig :refresh-token="refreshToken" />
  </div>
</template>
