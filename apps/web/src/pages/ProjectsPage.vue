<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ProjectCreateDialog from '~/components/project/ProjectCreateDialog.vue'
import { Button } from '~/components/ui/button'
import { Column, DataTable } from '~/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select'
import { useActiveOrg } from '~/composables/useActiveOrg'
import { useNotify } from '~/composables/useNotify'
import { useOrgLookup } from '~/composables/useOrgLookup'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const notify = useNotify()
const projectsStore = useProjectsStore()
const orgLookup = useOrgLookup()
const { activeOrgId } = useActiveOrg()

const adminMode = computed(() => !!route.meta.adminMode)

const showCreateDialog = ref(false)

// Search
const filterField = ref<string>('name')
const filterValue = ref('')
const rows = 20
const first = ref(0)

const searchFieldOptions = [
  { label: 'Name', value: 'name' },
  { label: 'Description', value: 'description' },
  { label: 'ID', value: 'id' },
]

// Selection
const selected = ref<Record<string, unknown>[]>([])
const showBulkDeleteDialog = ref(false)

async function loadData() {
  selected.value = []
  if (adminMode.value) {
    await projectsStore.fetchProjects({
      limit: rows,
      offset: first.value,
      ...(filterValue.value ? { [filterField.value]: filterValue.value } : {}),
    })
    const orgIds = projectsStore.projects.map(p => p.organizationId).filter(Boolean) as string[]
    if (orgIds.length > 0) orgLookup.resolveOrgs(orgIds)
  } else {
    const orgId = activeOrgId.value
    await projectsStore.fetchProjects({
      limit: rows,
      offset: first.value,
      ...(orgId ? { organizationId: orgId } : {}),
      ...(filterValue.value ? { [filterField.value]: filterValue.value } : {}),
    })
  }
}

function applyFilters() {
  first.value = 0
  loadData()
}

function onPage(event: { first: number, rows: number }) {
  first.value = event.first
  loadData()
}

onMounted(() => {
  loadData()
  // Deep-link support: /projects?new=1 opens the create dialog
  // (used by the ⌘K command palette's "New project" command).
  if (route.query.new !== undefined && !adminMode.value) {
    showCreateDialog.value = true
  }
})

watch(adminMode, () => {
  first.value = 0
  filterField.value = 'name'
  filterValue.value = ''
  selected.value = []
  loadData()
})

// Reload projects when the active organization changes
watch(activeOrgId, () => {
  if (!adminMode.value) {
    first.value = 0
    loadData()
  }
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

async function handleBulkDelete() {
  const count = selected.value.length
  for (const item of selected.value) {
    await projectsStore.deleteProject(item.id as string)
  }
  selected.value = []
  showBulkDeleteDialog.value = false
  notify.success(`${count} project${count > 1 ? 's' : ''} deleted`)
  loadData()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
          {{ adminMode ? 'All projects' : 'Projects' }}
        </h1>
        <p class="text-[var(--app-muted)]">
          {{ adminMode ? 'View all projects across the platform' : 'Manage your projects' }}
        </p>
      </div>
      <Button
        v-if="!adminMode"
        @click="showCreateDialog = true"
      >
        New project
      </Button>
    </div>

    <!-- Filters -->
    <div class="flex items-end gap-4">
      <div class="flex flex-col gap-1">
        <label
          for="filter-field"
          class="text-sm text-[var(--app-muted)]"
        >Search by</label>
        <Select
          id="filter-field"
          v-model="filterField"
          :options="searchFieldOptions"
          option-label="label"
          option-value="value"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label
          for="filter-value"
          class="text-sm text-[var(--app-muted)]"
        >Search</label>
        <Input
          id="filter-value"
          v-model="filterValue"
          :placeholder="`Search by ${searchFieldOptions.find(o => o.value === filterField)?.label?.toLowerCase() ?? filterField}...`"
          @keyup.enter="applyFilters"
        />
      </div>
      <Button @click="applyFilters">
        Apply
      </Button>
    </div>

    <!-- Bulk action bar -->
    <div
      v-if="selected.length > 0"
      class="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-800 rounded-md"
    >
      <span class="text-sm font-medium text-[var(--app-fg)]">{{ selected.length }} selected</span>
      <Button
        v-if="!adminMode"
        variant="outline"
        size="sm"
        class="text-destructive border-destructive/40 hover:bg-destructive/10"
        @click="showBulkDeleteDialog = true"
      >
        Delete
      </Button>
      <Button
        variant="ghost"
        size="sm"
        @click="selected = []"
      >
        Clear
      </Button>
    </div>

    <DataTable
      v-model:selection="selected"
      :value="projectsStore.projects"
      :loading="projectsStore.loading"
      data-key="id"
      striped-rows
      table-style="min-width: 50rem"
      lazy
      paginator
      :rows="rows"
      :total-records="projectsStore.total"
      :first="first"
      @page="onPage"
    >
      <template #empty>
        No projects yet. Create your first project to get started.
      </template>
      <Column
        selection-mode="multiple"
        header-style="width: 3rem"
      />
      <Column
        field="name"
        header="Name"
      >
        <template #body="{ data }">
          <div class="flex flex-col">
            <RouterLink
              :to="{ name: adminMode ? 'settings-admin-project-detail' : 'project-detail', params: { id: data.id } }"
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
      <Column
        v-if="adminMode"
        header="Owner"
      >
        <template #body="{ data }">
          <div class="flex flex-col">
            <RouterLink
              v-if="data.owner"
              :to="{ name: 'settings-admin-user-detail', params: { id: data.ownerId } }"
              class="font-medium text-[var(--app-link)] hover:underline"
            >
              {{ data.owner.name }}
            </RouterLink>
            <span class="text-xs text-[var(--app-muted)] font-mono">{{ data.ownerId }}</span>
          </div>
        </template>
      </Column>
      <Column
        v-if="adminMode"
        header="Organization"
      >
        <template #body="{ data }">
          <div
            v-if="data.organizationId"
            class="flex flex-col"
          >
            <RouterLink
              :to="{ name: 'settings-admin-organization-detail', params: { id: data.organizationId } }"
              class="font-medium text-[var(--app-link)] hover:underline"
            >
              {{ orgLookup.getOrgName(data.organizationId) }}
            </RouterLink>
            <span class="text-xs text-[var(--app-muted)] font-mono">{{ data.organizationId }}</span>
          </div>
          <span
            v-else
            class="text-[var(--app-muted)]"
          >&mdash;</span>
        </template>
      </Column>
      <Column header="Created">
        <template #body="{ data }">
          <span class="text-[var(--app-muted)]">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>
    </DataTable>

    <!-- Create dialog -->
    <ProjectCreateDialog
      v-if="!adminMode"
      v-model:open="showCreateDialog"
      @created="loadData"
    />

    <!-- Bulk delete dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:open="showBulkDeleteDialog"
    >
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete selected projects</DialogTitle>
        </DialogHeader>
        <p class="text-[var(--app-muted)]">
          Are you sure you want to delete {{ selected.length }} project(s)? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-2 mt-6">
          <Button
            variant="secondary"
            @click="showBulkDeleteDialog = false"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            :loading="projectsStore.loading"
            @click="handleBulkDelete"
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
