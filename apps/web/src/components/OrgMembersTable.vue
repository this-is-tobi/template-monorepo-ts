<script setup lang="ts">
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Column, DataTable } from '~/components/ui/data-table'

interface Member {
  id: string
  userId: string
  role: string
  createdAt: string | Date
  user: {
    name: string
    email: string
  }
}

withDefaults(defineProps<{
  members: Member[]
  /** Whether member names link to the admin user detail page. */
  adminLinks?: boolean
  /** Whether to show per-row Role / Remove action buttons. */
  showActions?: boolean
  /** Current user's ID — used to hide actions on the user's own row. */
  currentUserId?: string
}>(), {
  adminLinks: false,
  showActions: false,
  currentUserId: undefined,
})

const emit = defineEmits<{
  roleEdit: [memberId: string, memberName: string, role: string]
  remove: [memberId: string]
}>()

function roleSeverity(role: string) {
  if (role === 'owner') return 'destructive' as const
  if (role === 'admin') return 'warning' as const
  return 'info' as const
}

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <DataTable
    :value="members"
    striped-rows
  >
    <template #empty>
      No members.
    </template>
    <Column
      field="user.name"
      header="Name"
    >
      <template #body="{ data }">
        <div class="flex flex-col">
          <RouterLink
            v-if="adminLinks"
            :to="{ name: 'settings-admin-user-detail', params: { id: data.userId } }"
            class="font-medium text-[var(--app-link)] hover:underline"
          >
            {{ data.user.name }}
          </RouterLink>
          <span
            v-else
            class="font-medium text-[var(--app-fg)]"
          >{{ data.user.name }}</span>
          <span class="text-xs text-[var(--app-muted)] font-mono">{{ data.userId }}</span>
        </div>
      </template>
    </Column>
    <Column
      field="user.email"
      header="Email"
    >
      <template #body="{ data }">
        <a
          :href="`mailto:${data.user.email}`"
          class="text-[var(--app-link)] hover:underline"
        >{{ data.user.email }}</a>
      </template>
    </Column>
    <Column
      field="role"
      header="Role"
    >
      <template #body="{ data }">
        <Badge :variant="roleSeverity(data.role)">
          {{ data.role }}
        </Badge>
      </template>
    </Column>
    <Column header="Joined">
      <template #body="{ data }">
        <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.createdAt) }}</span>
      </template>
    </Column>
    <Column
      v-if="showActions"
      header="Actions"
      style="width: 12rem"
    >
      <template #body="{ data }">
        <div
          v-if="data.userId !== currentUserId"
          class="flex gap-2"
        >
          <Button
            variant="ghost"
            size="sm"
            @click="emit('roleEdit', data.id, data.user.name, data.role)"
          >
            Role
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="text-destructive hover:bg-destructive/10"
            @click="emit('remove', data.id)"
          >
            Remove
          </Button>
        </div>
      </template>
    </Column>
  </DataTable>
</template>
