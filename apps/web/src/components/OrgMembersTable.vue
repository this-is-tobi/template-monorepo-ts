<script setup lang="ts">
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'

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
  'role-edit': [memberId: string, memberName: string, role: string]
  remove: [memberId: string]
}>()

function roleSeverity(role: string) {
  if (role === 'owner') return 'danger'
  if (role === 'admin') return 'warn'
  return 'info'
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
        <Tag
          :value="data.role"
          :severity="roleSeverity(data.role)"
        />
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
            label="Role"
            text
            size="small"
            @click="emit('role-edit', data.id, data.user.name, data.role)"
          />
          <Button
            label="Remove"
            text
            severity="danger"
            size="small"
            @click="emit('remove', data.id)"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>
