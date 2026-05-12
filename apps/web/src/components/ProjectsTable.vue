<script setup lang="ts">
import type { DataTablePageEvent } from 'primevue/datatable'
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
  loading?: boolean
  lazy?: boolean
  paginator?: boolean
  rows?: number
  total?: number
  first?: number
}>(), {
  emptyMessage: 'No projects.',
  loading: false,
  lazy: false,
  paginator: false,
  rows: 20,
  total: 0,
  first: 0,
})

const emit = defineEmits<{
  page: [event: DataTablePageEvent]
}>()

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <DataTable
    :value="projects"
    :loading="loading"
    striped-rows
    :lazy="lazy"
    :paginator="paginator"
    :rows="rows"
    :total-records="total"
    :first="first"
    @page="emit('page', $event)"
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
