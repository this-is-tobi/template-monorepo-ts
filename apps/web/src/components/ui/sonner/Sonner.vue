<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import { useThemeStore } from '~/stores/theme'
import 'vue-sonner/style.css'

/**
 * App-wide toast host (vue-sonner), themed with the design tokens so toasts
 * match light/dark mode and the configured palette.
 */
const themeStore = useThemeStore()
</script>

<template>
  <Toaster
    position="bottom-right"
    :theme="themeStore.isDark ? 'dark' : 'light'"
    :toast-options="{
      style: {
        background: 'var(--popover)',
        color: 'var(--popover-foreground)',
        border: '1px solid var(--border)',
      },
    }"
  />
</template>
