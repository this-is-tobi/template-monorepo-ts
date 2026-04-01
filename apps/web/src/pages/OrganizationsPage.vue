<script setup lang="ts">
import type { PageState } from 'primevue/paginator'
import type { Organization } from '~/stores/organizations'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminOrganizationsStore } from '~/stores/admin-organizations'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { useOrganizationsStore } from '~/stores/organizations'

const route = useRoute()
const organizationsStore = useOrganizationsStore()
const adminOrgsStore = useAdminOrganizationsStore()
const configStore = useConfigStore()
const authStore = useAuthStore()

const adminMode = computed(() => !!route.meta.adminMode)
const canCreate = computed(() => !adminMode.value && (authStore.isAdmin || configStore.config.allowOrganizationCreation))

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const editingOrg = ref<Organization | null>(null)
const deletingOrg = ref<Organization | null>(null)

const createForm = ref({ name: '', slug: '' })
const editForm = ref({ name: '' })

// Admin filters
const filterName = ref('')
const filterSlug = ref('')
const rows = 20
const first = ref(0)

const displayOrganizations = computed(() =>
  adminMode.value ? adminOrgsStore.organizations : organizationsStore.organizations,
)

const displayLoading = computed(() =>
  adminMode.value ? adminOrgsStore.loading : organizationsStore.loading,
)

const displayError = computed(() =>
  adminMode.value ? adminOrgsStore.error : organizationsStore.error,
)

watch(() => createForm.value.name, (name) => {
  createForm.value.slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
})

function loadData() {
  if (adminMode.value) {
    adminOrgsStore.fetchOrganizations({
      limit: rows,
      offset: first.value,
      ...(filterName.value ? { name: filterName.value } : {}),
      ...(filterSlug.value ? { slug: filterSlug.value } : {}),
    })
  } else {
    organizationsStore.fetchOrganizations()
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
  filterSlug.value = ''
  loadData()
})

async function handleCreate() {
  const result = await organizationsStore.createOrganization(
    createForm.value.name,
    createForm.value.slug,
  )
  if (result) {
    createForm.value = { name: '', slug: '' }
    showCreateDialog.value = false
  }
}

function openEdit(org: Organization) {
  editingOrg.value = org
  editForm.value = { name: org.name }
  showEditDialog.value = true
}

async function handleEdit() {
  if (!editingOrg.value) return
  const result = await organizationsStore.updateOrganization(editingOrg.value.id, {
    name: editForm.value.name,
  })
  if (result) {
    editingOrg.value = null
    showEditDialog.value = false
  }
}

function confirmDelete(org: Organization) {
  deletingOrg.value = org
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingOrg.value) return
  const ok = await organizationsStore.deleteOrganization(deletingOrg.value.id)
  if (ok) {
    deletingOrg.value = null
    showDeleteDialog.value = false
  }
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
          {{ adminMode ? 'All organizations' : 'Organizations' }}
        </h1>
        <p class="text-[var(--app-muted)]">
          {{ adminMode ? 'View all organizations across the platform' : 'Manage your organizations' }}
        </p>
      </div>
      <Button
        v-if="canCreate"
        label="New organization"
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
      <div class="flex flex-col gap-1">
        <label
          for="filter-slug"
          class="text-sm text-[var(--app-muted)]"
        >Slug</label>
        <InputText
          id="filter-slug"
          v-model="filterSlug"
          placeholder="Search by slug"
          @keyup.enter="applyFilters"
        />
      </div>
      <Button
        label="Apply"
        @click="applyFilters"
      />
    </div>

    <Message
      v-if="displayError"
      severity="error"
    >
      {{ displayError }}
    </Message>

    <DataTable
      :value="displayOrganizations"
      :loading="displayLoading"
      striped-rows
      table-style="min-width: 50rem"
      :lazy="adminMode"
      :paginator="adminMode"
      :rows="rows"
      :total-records="adminOrgsStore.total"
      :first="first"
      @page="onPage"
    >
      <template #empty>
        No organizations yet.
      </template>
      <Column
        field="name"
        header="Name"
      >
        <template #body="{ data }">
          <RouterLink
            v-if="!adminMode"
            :to="{ name: 'organization-detail', params: { id: data.id } }"
            class="text-primary hover:underline font-medium"
          >
            {{ data.name }}
          </RouterLink>
          <span
            v-else
            class="font-medium text-[var(--app-fg)]"
          >{{ data.name }}</span>
        </template>
      </Column>
      <Column
        field="slug"
        header="Slug"
      >
        <template #body="{ data }">
          <span class="text-[var(--app-muted)]">{{ data.slug }}</span>
        </template>
      </Column>
      <Column
        v-if="adminMode"
        header="Members"
      >
        <template #body="{ data }">
          <span class="text-[var(--app-muted)]">{{ data.memberCount ?? '—' }}</span>
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
              @click="confirmDelete(data)"
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
      header="Create organization"
      :style="{ width: '28rem' }"
    >
      <form @submit.prevent="handleCreate">
        <p class="text-[var(--app-muted)] mb-4">
          Create a new organization.
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="create-name">Name</label>
            <InputText
              id="create-name"
              v-model="createForm.name"
              placeholder="My organization"
              required
              minlength="2"
              maxlength="100"
              fluid
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="create-slug">Slug</label>
            <InputText
              id="create-slug"
              v-model="createForm.slug"
              placeholder="my-organization"
              required
              minlength="2"
              maxlength="100"
              fluid
            />
          </div>
          <Message
            v-if="organizationsStore.error"
            severity="error"
          >
            {{ organizationsStore.error }}
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
            :label="organizationsStore.loading ? 'Creating...' : 'Create'"
            :loading="organizationsStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Edit dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:visible="showEditDialog"
      modal
      header="Edit organization"
      :style="{ width: '28rem' }"
    >
      <form @submit.prevent="handleEdit">
        <p class="text-[var(--app-muted)] mb-4">
          Update your organization details.
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="edit-name">Name</label>
            <InputText
              id="edit-name"
              v-model="editForm.name"
              required
              minlength="2"
              maxlength="100"
              fluid
            />
          </div>
          <Message
            v-if="organizationsStore.error"
            severity="error"
          >
            {{ organizationsStore.error }}
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
            :label="organizationsStore.loading ? 'Saving...' : 'Save'"
            :loading="organizationsStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Delete confirmation dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:visible="showDeleteDialog"
      modal
      header="Delete organization"
      :style="{ width: '28rem' }"
    >
      <p class="text-[var(--app-muted)] mb-4">
        Are you sure you want to delete <strong>{{ deletingOrg?.name }}</strong>? This action cannot be undone.
      </p>
      <Message
        v-if="organizationsStore.error"
        severity="error"
      >
        {{ organizationsStore.error }}
      </Message>
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
          :loading="organizationsStore.loading"
          @click="handleDelete"
        />
      </div>
    </Dialog>
  </div>
</template>
