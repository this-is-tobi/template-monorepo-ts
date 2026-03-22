<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
        Profile
      </h1>
      <p class="text-sm text-[var(--app-muted)]">
        Your account information.
      </p>
    </div>

    <div class="flex flex-col gap-4 max-w-md">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Name</span>
        <span class="text-sm text-[var(--app-fg)]">{{ auth.user?.name }}</span>
      </div>
      <div class="border-t border-surface" />
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Email</span>
        <span class="text-sm text-[var(--app-fg)]">{{ auth.user?.email }}</span>
      </div>
      <div class="border-t border-surface" />
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Role</span>
        <span class="text-sm text-[var(--app-fg)]">{{ auth.user?.role ?? 'user' }}</span>
      </div>
    </div>
  </div>
</template>
