<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { settingsNav } from '~/lib/navigation'

const route = useRoute()

/**
 * The administration pages (`/settings/admin/*`) are nested under this route
 * but are full pages that bring their own `h1` — reusing the same components
 * as `/projects`, `/organizations` and so on. Showing the settings header
 * around them would stack two page titles, so the shell steps aside and
 * renders only the child.
 *
 * Section navigation lives in the sidebar, which expands `settingsNav` while
 * you are in this area — repeating it as tabs here would be two menus for one
 * set of destinations.
 */
const isSection = computed(() => settingsNav.some(item => item.to === route.path))
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="isSection">
      <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
        Settings
      </h1>
      <p class="text-sm text-[var(--app-muted)]">
        Manage platform configuration.
      </p>
    </div>

    <RouterView />
  </div>
</template>
