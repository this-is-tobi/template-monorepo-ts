<script setup lang="ts">
import { onMounted } from 'vue'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useOrganizationsStore } from '~/stores/organizations'

const organizationsStore = useOrganizationsStore()

onMounted(() => organizationsStore.fetchOrganizations())

/**
 * Every user gets an auto-created personal org slugged `personal-<userId>`.
 * Showing that raw slug leaks a UUID into the UI for no benefit — label it
 * instead.
 */
function isPersonal(slug: string | null | undefined): boolean {
  return !!slug?.startsWith('personal-')
}
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0">
      <CardTitle class="text-base">
        Your organizations
      </CardTitle>
      <RouterLink
        v-if="organizationsStore.organizations.length > 0"
        class="text-sm text-[var(--primary)] hover:underline"
        to="/organizations"
      >
        View all
      </RouterLink>
    </CardHeader>
    <CardContent>
      <p v-if="organizationsStore.organizations.length === 0" class="text-sm text-[var(--app-muted)]">
        Not a member of any organization.
        <RouterLink class="text-[var(--primary)] hover:underline" to="/organizations">
          Create one →
        </RouterLink>
      </p>
      <ul v-else class="flex flex-col divide-y divide-[var(--app-border)]">
        <li
          v-for="org in organizationsStore.organizations"
          :key="org.id"
          class="flex items-center justify-between gap-3 py-2"
        >
          <RouterLink
            :to="`/organizations/${org.id}`"
            class="min-w-0 truncate font-medium text-[var(--app-fg)] hover:text-[var(--primary)]"
          >
            {{ org.name }}
          </RouterLink>
          <Badge v-if="isPersonal(org.slug)" variant="secondary" class="shrink-0">
            Personal
          </Badge>
          <span v-else class="shrink-0 truncate font-mono text-xs text-[var(--app-muted)]">
            {{ org.slug }}
          </span>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
