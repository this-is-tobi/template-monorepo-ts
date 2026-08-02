<script setup lang="ts">
import { accountNav } from '~/lib/navigation'
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
        Account
      </h1>
      <p class="text-sm text-[var(--app-muted)]">
        Manage your profile and security settings.
      </p>
    </div>

    <!-- Section tabs. Driven by `accountNav` so removing a section is a
         one-line change there plus deleting its route. -->
    <nav
      class="flex gap-1 border-b border-[var(--app-border)]"
      aria-label="Account sections"
    >
      <RouterLink
        v-for="item in accountNav"
        :key="item.to"
        :to="item.to"
        class="-mb-px flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-[var(--app-muted)] transition-colors hover:text-[var(--app-fg)]"
        active-class="border-[var(--primary)] text-[var(--app-fg)] font-medium"
      >
        <component :is="item.icon" :size="15" class="shrink-0" />
        {{ item.label }}
      </RouterLink>
    </nav>

    <RouterView />
  </div>
</template>
