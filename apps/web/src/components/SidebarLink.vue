<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Sidebar navigation link — one consistent style for every nav entry.
 * `compact` renders the smaller variant used by settings sub-items.
 */
defineProps<{
  to: string
  label: string
  icon: Component
  compact?: boolean
}>()

const emit = defineEmits<{ navigate: [] }>()
</script>

<template>
  <RouterLink
    :to="to"
    class="flex items-center rounded-md text-sm text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
    :class="compact ? 'gap-2 px-3 py-1.5' : 'gap-3 px-3 py-2'"
    active-class="bg-surface-100 dark:bg-surface-800 text-[var(--app-fg)] font-medium"
    @click="emit('navigate')"
  >
    <component :is="icon" :size="compact ? 14 : 16" class="shrink-0" />
    {{ label }}
  </RouterLink>
</template>
