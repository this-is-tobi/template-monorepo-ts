<script setup lang="ts">
import { useConfigStore } from '~/stores/config'
import { useThemeStore } from '~/stores/theme'

const configStore = useConfigStore()
const themeStore = useThemeStore()
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
    <div class="absolute top-4 right-4">
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :aria-label="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="themeStore.toggleDarkMode()"
      >
        <!-- Sun icon (shown in dark mode to switch to light) -->
        <svg v-if="themeStore.isDark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
        <!-- Moon icon (shown in light mode to switch to dark) -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </button>
    </div>
    <div class="w-full max-w-sm space-y-6 px-4">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-[var(--app-fg)]">
          {{ configStore.config.appName }}
        </h1>
      </div>
      <slot />
    </div>
  </div>
</template>
