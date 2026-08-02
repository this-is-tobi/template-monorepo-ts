<script setup lang="ts">
import { computed } from 'vue'
import { dashboardWidgets } from '~/lib/dashboard'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()

/**
 * The page is just a renderer — composition lives in `lib/dashboard.ts`.
 * Each widget fetches its own data, so adding or removing one is a single
 * edit there with no changes here.
 */
const widgets = computed(() => {
  const ctx = { isAdmin: auth.isAdmin }
  return dashboardWidgets.filter(w => w.visible?.(ctx) ?? true)
})

const fullWidth = computed(() => widgets.value.filter(w => (w.span ?? 'full') === 'full'))
const halfWidth = computed(() => widgets.value.filter(w => w.span === 'half'))
</script>

<template>
  <div class="flex flex-col gap-8">
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
        Dashboard
      </h1>
      <p class="text-[var(--app-muted)]">
        Welcome back, {{ auth.user?.name }}.
      </p>
    </div>

    <component
      :is="widget.component"
      v-for="widget in fullWidth"
      :key="widget.id"
    />

    <!-- Half-width widgets share a 2-column grid; `items-start` keeps each
         card at its natural height instead of stretching to match its row. -->
    <div v-if="halfWidth.length > 0" class="grid items-start gap-6 lg:grid-cols-2">
      <component
        :is="widget.component"
        v-for="widget in halfWidth"
        :key="widget.id"
      />
    </div>
  </div>
</template>
