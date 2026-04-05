<script setup lang="ts">
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'

interface Project {
  id: string
  name: string
  description?: string | null
  createdAt: string | Date
}

withDefaults(defineProps<{
  projects: Project[]
  emptyMessage?: string
}>(), {
  emptyMessage: 'No projects.',
})

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <DataTable
    :value="projects"
    striped-rows
  >
    <template #empty>
      {{ emptyMessage }}
    </template>
    <Column
      field="name"
      header="Name"
    >
      <template #body="{ data }">
        <div class="flex flex-col">
          <RouterLink
            :to="{ name: 'project-detail', params: { id: data.id } }"
            class="font-medium text-[var(--app-link)] hover:underline"
          >
            {{ data.name }}
          </RouterLink>
          <span class="text-xs text-[var(--app-muted)] font-mono">{{ data.id }}</span>
        </div>
      </template>
    </Column>
    <Column
      field="description"
      header="Description"
    >
      <template #body="{ data }">
        <span class="text-[var(--app-muted)]">{{ data.description ?? '—' }}</span>
      </template>
    </Column>
    <Column header="Created">
      <template #body="{ data }">
        <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.createdAt) }}</span>
      </template>
    </Column>
  </DataTable>
</template>
