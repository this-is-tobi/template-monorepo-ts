<script setup lang="ts">
import type { AuditQuery } from '~/stores/audit'
import { onMounted, ref } from 'vue'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Column, DataTable } from '~/components/ui/data-table'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select'
import { useUserLookup } from '~/composables/useUserLookup'
import { useAuditStore } from '~/stores/audit'

const auditStore = useAuditStore()
const userLookup = useUserLookup()

const filters = ref<Partial<AuditQuery>>({
  limit: 50,
  offset: 0,
})

// 'all' is a sentinel — mapped to `undefined` (no filter) before querying.
const resourceTypeFilter = ref<string | number | null>('all')

const resourceTypeOptions = [
  { label: 'All', value: 'all' },
  { label: 'Project', value: 'project' },
  { label: 'Organization', value: 'organization' },
  { label: 'User', value: 'user' },
  { label: 'Session', value: 'session' },
  { label: 'API key', value: 'apikey' },
  { label: 'Config', value: 'config' },
  { label: 'Theme', value: 'theme' },
  { label: 'Audit', value: 'audit' },
]

const currentPage = ref(0)
const pageSize = 50

onMounted(async () => {
  await auditStore.fetchLogs(filters.value)
  resolveActors()
})

function resolveActors() {
  const ids = auditStore.entries.map(e => e.actorId).filter(Boolean) as string[]
  if (ids.length > 0) userLookup.resolveUsers(ids)
}

async function applyFilters() {
  currentPage.value = 0
  filters.value.offset = 0
  filters.value.resourceType = !resourceTypeFilter.value || resourceTypeFilter.value === 'all'
    ? undefined
    : String(resourceTypeFilter.value)
  await auditStore.fetchLogs(filters.value)
  resolveActors()
}

async function onPage(event: { first: number, rows: number }) {
  currentPage.value = Math.floor(event.first / pageSize)
  filters.value.offset = event.first
  await auditStore.fetchLogs(filters.value)
  resolveActors()
}

function actionSeverity(action: string) {
  if (action.includes('delete')) return 'destructive' as const
  if (action.includes('create')) return 'success' as const
  if (action.includes('update')) return 'warning' as const
  return 'info' as const
}

function formatDate(dateStr: string | Date | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

function formatDetails(details: Record<string, unknown> | null | undefined) {
  if (!details) return '—'
  return JSON.stringify(details, null, 2)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
        Audit logs
      </h1>
      <p class="text-sm text-[var(--app-muted)]">
        View platform activity and security events.
      </p>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--app-muted)]">Actor ID</label>
        <Input
          v-model="filters.actorId"
          placeholder="Filter by actor..."
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--app-muted)]">Resource type</label>
        <Select
          v-model="resourceTypeFilter"
          :options="resourceTypeOptions"
          option-label="label"
          option-value="value"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--app-muted)]">Action</label>
        <Input
          v-model="filters.action"
          placeholder="e.g. project:create"
        />
      </div>
      <Button @click="applyFilters">
        Apply
      </Button>
    </div>

    <Alert
      v-if="auditStore.error"
      variant="destructive"
    >
      {{ auditStore.error }}
    </Alert>

    <!-- Results -->
    <DataTable
      :value="auditStore.entries"
      :loading="auditStore.loading"
      lazy
      paginator
      :rows="pageSize"
      :total-records="auditStore.total"
      :first="currentPage * pageSize"
      striped-rows
      @page="onPage"
    >
      <template #empty>
        No audit entries found.
      </template>
      <Column
        field="createdAt"
        header="Time"
        style="width: 12rem"
      >
        <template #body="{ data }">
          <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>
      <Column
        field="action"
        header="Action"
      >
        <template #body="{ data }">
          <Badge :variant="actionSeverity(data.action)">
            {{ data.action }}
          </Badge>
        </template>
      </Column>
      <Column
        field="resourceType"
        header="Resource"
      >
        <template #body="{ data }">
          <div class="flex flex-col">
            <span class="text-[var(--app-fg)] text-sm">{{ data.resourceType }}</span>
            <RouterLink
              v-if="data.resourceId && data.resourceType === 'project'"
              :to="{ name: 'project-detail', params: { id: data.resourceId } }"
              class="text-[var(--app-muted)] text-xs font-mono hover:underline"
            >
              {{ data.resourceId }}
            </RouterLink>
            <RouterLink
              v-else-if="data.resourceId && data.resourceType === 'organization'"
              :to="{ name: 'settings-admin-organization-detail', params: { id: data.resourceId } }"
              class="text-[var(--app-muted)] text-xs font-mono hover:underline"
            >
              {{ data.resourceId }}
            </RouterLink>
            <RouterLink
              v-else-if="data.resourceId && data.resourceType === 'user'"
              :to="{ name: 'settings-admin-user-detail', params: { id: data.resourceId } }"
              class="text-[var(--app-muted)] text-xs font-mono hover:underline"
            >
              {{ data.resourceId }}
            </RouterLink>
            <RouterLink
              v-else-if="data.resourceId && data.resourceType === 'apikey'"
              :to="{ name: 'settings-admin-api-key-detail', params: { id: data.resourceId } }"
              class="text-[var(--app-muted)] text-xs font-mono hover:underline"
            >
              {{ data.resourceId }}
            </RouterLink>
            <span
              v-else-if="data.resourceId"
              class="text-[var(--app-muted)] text-xs font-mono"
            >{{ data.resourceId }}</span>
          </div>
        </template>
      </Column>
      <Column
        field="actorId"
        header="Actor"
      >
        <template #body="{ data }">
          <div class="flex flex-col">
            <span
              v-if="userLookup.getUser(data.actorId)"
              class="text-[var(--app-fg)] text-sm"
            >
              {{ userLookup.getUserName(data.actorId) }}
            </span>
            <RouterLink
              :to="{ name: 'settings-admin-user-detail', params: { id: data.actorId } }"
              class="text-[var(--app-muted)] text-xs font-mono hover:underline"
            >
              {{ data.actorId }}
            </RouterLink>
          </div>
        </template>
      </Column>
      <Column
        field="details"
        header="Details"
      >
        <template #body="{ data }">
          <span
            v-if="!data.details"
            class="text-[var(--app-muted)] text-sm"
          >—</span>
          <pre
            v-else
            class="text-[var(--app-muted)] text-sm font-mono bg-[var(--app-bg)] rounded-md p-2 max-h-48 overflow-auto"
          ><code>{{ formatDetails(data.details) }}</code></pre>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
