<script setup lang="ts">
import type { PageState } from 'primevue/paginator'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~/lib/auth'
import { useOrgLookup } from '~/composables/useOrgLookup'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const projectsStore = useProjectsStore()
const orgLookup = useOrgLookup()
const activeOrg = authClient.useActiveOrganization()

const adminMode = computed(() => !!route.meta.adminMode)

const showCreateDialog = ref(false)

const createForm = ref({ name: '', description: '' })

// Search
const filterField = ref<string>('name')
const filterValue = ref('')
const rows = 20
const first = ref(0)

const searchFieldOptions = computed(() =>
  adminMode.value
    ? [{ label: 'Name', value: 'name' }, { label: 'Description', value: 'description' }, { label: 'ID', value: 'id' }]
    : [{ label: 'Name', value: 'name' }, { label: 'Description', value: 'description' }, { label: 'ID', value: 'id' }],
)

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
    const orgId = activeOrg.value?.data?.id
    projectsStore.fetchProjects(orgId ? { organizationId: orgId } : undefined)
  }
}

function applyFilters() {
  first.value = 0
  loadData()
}

function onPage(event: PageState) {
  first.value = event.first
  loadData()
}

onMounted(() => {
  loadData()
})

watch(adminMode, () => {
  first.value = 0
  filterField.value = 'name'
  filterValue.value = ''
  selected.value = []
  loadData()
})

// Reload projects when the active organization changes
watch(() => activeOrg.value?.data?.id, () => {
  if (!adminMode.value) loadData()
})

async function handleCreate() {
  const result = await projectsStore.createProject({
    name: createForm.value.name,
    description: createForm.value.description || null,
  })
  if (result) {
    createForm.value = { name: '', description: '' }
    showCreateDialog.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

const filteredProjects = computed(() => {
  if (adminMode.value) return projectsStore.projects
  if (!filterValue.value) return projectsStore.projects
  const val = filterValue.value.toLowerCase()
  return projectsStore.projects.filter((p) => {
    const field = p[filterField.value as keyof typeof p]
    return field && String(field).toLowerCase().includes(val)
  })
})

async function handleBulkDelete() {
  for (const item of selected.value) {
    await projectsStore.deleteProject(item.id as string)
  }
  selected.value = []
  showBulkDeleteDialog.value = false
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
        label="New project"
        @click="showCreateDialog = true"
      />
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
        <InputText
          id="filter-value"
          v-model="filterValue"
          :placeholder="`Search by ${searchFieldOptions.find(o => o.value === filterField)?.label?.toLowerCase() ?? filterField}...`"
          @keyup.enter="adminMode ? applyFilters() : undefined"
        />
      </div>
      <Button
        v-if="adminMode"
        label="Apply"
        @click="applyFilters"
      />
    </div>

    <!-- Bulk action bar -->
    <div
      v-if="selected.length > 0"
      class="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-800 rounded-md"
    >
      <span class="text-sm font-medium text-[var(--app-fg)]">{{ selected.length }} selected</span>
      <Button
        v-if="!adminMode"
        label="Delete"
        severity="danger"
        size="small"
        outlined
        @click="showBulkDeleteDialog = true"
      />
      <Button
        label="Clear"
        text
        size="small"
        @click="selected = []"
      />
    </div>

    <DataTable
      v-model:selection="selected"
      :value="adminMode ? projectsStore.projects : filteredProjects"
      :loading="projectsStore.loading"
      data-key="id"
      striped-rows
      table-style="min-width: 50rem"
      :lazy="adminMode"
      :paginator="adminMode"
      :rows="rows"
      :total-records="projectsStore.total ?? 0"
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
    <Dialog
      v-if="!adminMode"
      v-model:visible="showCreateDialog"
      modal
      header="Create project"
      :style="{ width: '28rem' }"
    >
      <form @submit.prevent="handleCreate">
        <p class="text-[var(--app-muted)] mb-4">
          Add a new project to your workspace.
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="create-name">Name</label>
            <InputText
              id="create-name"
              v-model="createForm.name"
              placeholder="My project"
              required
              minlength="3"
              maxlength="100"
              fluid
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="create-description">Description</label>
            <InputText
              id="create-description"
              v-model="createForm.description"
              placeholder="Optional description"
              maxlength="500"
              fluid
            />
          </div>
          <Message
            v-if="projectsStore.error"
            severity="error"
          >
            {{ projectsStore.error }}
          </Message>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            @click="showCreateDialog = false"
          />
          <Button
            type="submit"
            :label="projectsStore.loading ? 'Creating...' : 'Create'"
            :loading="projectsStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Bulk delete dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:visible="showBulkDeleteDialog"
      modal
      header="Delete selected projects"
      class="w-full max-w-md"
    >
      <p class="text-[var(--app-muted)]">
        Are you sure you want to delete {{ selected.length }} project(s)? This action cannot be undone.
      </p>
      <div class="flex justify-end gap-2 mt-6">
        <Button
          label="Cancel"
          severity="secondary"
          @click="showBulkDeleteDialog = false"
        />
        <Button
          label="Delete"
          severity="danger"
          :loading="projectsStore.loading"
          @click="handleBulkDelete"
        />
      </div>
    </Dialog>
  </div>
</template>
