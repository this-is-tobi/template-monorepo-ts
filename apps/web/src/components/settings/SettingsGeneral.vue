<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiClient } from '~/lib/api'
import { config } from '~/lib/config'

const webVersion = config.appVersion

const apiVersion = ref<string>()
const apiStatus = ref<'ok' | 'degraded' | 'loading'>('loading')

interface ComponentStatus {
  status: 'ok' | 'unavailable'
  message?: string
}

const components = ref<Record<string, ComponentStatus>>({})
const componentsLoading = ref(true)

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

onMounted(fetchSystemInfo)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2 class="text-xl font-semibold tracking-tight text-[var(--app-fg)]">
        General
      </h2>
      <p class="text-sm text-[var(--app-muted)]">
        Platform information and service status.
      </p>
    </div>

    <!-- Versions -->
    <div class="flex flex-col gap-3">
      <h3 class="text-sm font-medium text-[var(--app-fg)]">
        Versions
      </h3>
      <div class="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 max-w-sm">
        <span class="text-sm text-[var(--app-muted)]">Web</span>
        <span class="text-sm text-[var(--app-fg)] font-mono">{{ webVersion }}</span>
        <span class="text-sm text-[var(--app-muted)]">API</span>
        <span class="text-sm text-[var(--app-fg)] font-mono">{{ apiVersion ?? '...' }}</span>
      </div>
    </div>

    <div class="border-t border-surface" />

    <!-- Service status -->
    <div class="flex flex-col gap-3">
      <h3 class="text-sm font-medium text-[var(--app-fg)]">
        Service status
      </h3>
      <div class="flex flex-col gap-2 max-w-sm">
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
    </div>
  </div>
</template>
