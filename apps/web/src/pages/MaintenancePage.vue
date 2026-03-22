<script setup lang="ts">
import Card from 'primevue/card'
import { useConfigStore } from '~/stores/config'

const configStore = useConfigStore()
</script>

<template>
  <Card>
    <template #title>
      Under maintenance
    </template>
    <template #content>
      <div class="flex flex-col items-center gap-4 py-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--app-muted)]">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <p class="text-[var(--app-muted)]">
          {{ configStore.config.appName }} is currently undergoing scheduled maintenance.
          Please check back soon.
        </p>
      </div>
    </template>
  </Card>
</template>
