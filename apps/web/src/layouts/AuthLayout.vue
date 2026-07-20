<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useConfigStore } from '~/stores/config'
import { useThemeStore } from '~/stores/theme'

const configStore = useConfigStore()
const themeStore = useThemeStore()
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--app-bg)]">
    <!-- Backdrop — dot grid with a soft top glow (turborepo.dev treatment) -->
    <div class="bg-dot-grid" />
    <div class="bg-hero-glow" />

    <div class="absolute top-4 right-4">
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :aria-label="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="themeStore.toggleDarkMode()"
      >
        <Sun v-if="themeStore.isDark" :size="16" />
        <Moon v-else :size="16" />
      </button>
    </div>
    <div class="relative w-full max-w-sm space-y-6 px-4">
      <div class="text-center">
        <h1 class="text-gradient text-2xl font-bold">
          {{ configStore.config.appName }}
        </h1>
      </div>
      <slot />
    </div>
  </div>
</template>
