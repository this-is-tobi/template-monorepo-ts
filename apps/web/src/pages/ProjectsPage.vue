<script setup lang="ts">
import type { Project } from '@template-monorepo-ts/shared'
import type { PageState } from 'primevue/paginator'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~/lib/auth'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const projectsStore = useProjectsStore()
const activeOrg = authClient.useActiveOrganization()

const adminMode = computed(() => !!route.meta.adminMode)

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const editingProject = ref<Project | null>(null)
const deletingProjectId = ref<string | null>(null)

const createForm = ref({ name: '', description: '' })
const editForm = ref({ name: '', description: '' })

// Admin filters
const filterName = ref('')
const rows = 20
const first = ref(0)

function loadData() {
  if (adminMode.value) {
    projectsStore.fetchProjects({
      limit: rows,
      offset: first.value,
      ...(filterName.value ? { name: filterName.value } : {}),
    })
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
  filterName.value = ''
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

function openEdit(project: Project) {
  editingProject.value = project
  editForm.value = {
    name: project.name,
    description: project.description ?? '',
  }
  showEditDialog.value = true
}

async function handleEdit() {
  if (!editingProject.value) return
  const result = await projectsStore.updateProject(editingProject.value.id, {
    name: editForm.value.name,
    description: editForm.value.description || null,
  })
  if (result) {
    editingProject.value = null
    showEditDialog.value = false
  }
}

function confirmDelete(id: string) {
  deletingProjectId.value = id
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingProjectId.value) return
  const ok = await projectsStore.deleteProject(deletingProjectId.value)
  if (ok) {
    deletingProjectId.value = null
    showDeleteDialog.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
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

    <!-- Admin filters -->
    <div
      v-if="adminMode"
      class="flex items-end gap-4"
    >
      <div class="flex flex-col gap-1">
        <label
          for="filter-name"
          class="text-sm text-[var(--app-muted)]"
        >Name</label>
        <InputText
          id="filter-name"
          v-model="filterName"
          placeholder="Search by name"
          @keyup.enter="applyFilters"
        />
      </div>
      <Button
        label="Apply"
        @click="applyFilters"
      />
    </div>

    <DataTable
      :value="projectsStore.projects"
      :loading="projectsStore.loading"
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
        field="name"
        header="Name"
      >
        <template #body="{ data }">
          <RouterLink
            :to="{ name: 'project-detail', params: { id: data.id } }"
            class="text-primary hover:underline font-medium"
          >
            {{ data.name }}
          </RouterLink>
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
          <code class="text-sm text-[var(--app-muted)]">{{ data.ownerId }}</code>
        </template>
      </Column>
      <Column
        v-if="adminMode"
        header="Organization"
      >
        <template #body="{ data }">
          <code
            v-if="data.organizationId"
            class="text-sm text-[var(--app-muted)]"
          >{{ data.organizationId }}</code>
          <span
            v-else
            class="text-[var(--app-muted)]"
          >—</span>
        </template>
      </Column>
      <Column header="Created">
        <template #body="{ data }">
          <span class="text-[var(--app-muted)]">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>
      <Column
        v-if="!adminMode"
        header="Actions"
        style="width: 10rem"
      >
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              label="Edit"
              text
              size="small"
              @click="openEdit(data)"
            />
            <Button
              label="Delete"
              text
              severity="danger"
              size="small"
              @click="confirmDelete(data.id)"
            />
          </div>
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

    <!-- Edit dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:visible="showEditDialog"
      modal
      header="Edit project"
      :style="{ width: '28rem' }"
    >
      <form @submit.prevent="handleEdit">
        <p class="text-[var(--app-muted)] mb-4">
          Update your project details.
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="edit-name">Name</label>
            <InputText
              id="edit-name"
              v-model="editForm.name"
              required
              minlength="3"
              maxlength="100"
              fluid
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="edit-description">Description</label>
            <InputText
              id="edit-description"
              v-model="editForm.description"
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
            @click="showEditDialog = false"
          />
          <Button
            type="submit"
            :label="projectsStore.loading ? 'Saving...' : 'Save changes'"
            :loading="projectsStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Delete confirmation dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:visible="showDeleteDialog"
      modal
      header="Delete project"
      :style="{ width: '28rem' }"
    >
      <p class="text-[var(--app-muted)]">
        Are you sure you want to delete this project? This action cannot be undone.
      </p>
      <div class="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          @click="showDeleteDialog = false"
        />
        <Button
          label="Delete"
          severity="danger"
          :loading="projectsStore.loading"
          @click="handleDelete"
        />
      </div>
    </Dialog>
  </div>
</template>
