<script setup lang="ts">
import { parseOrgMetadata } from '@template-monorepo-ts/shared'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Column, DataTable } from '~/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select'
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

const createForm = ref({ name: '', slug: '' })

// Search
const filterField = ref<string>('name')
const filterValue = ref('')
const rows = 20
const first = ref(0)

const searchFieldOptions = computed(() =>
  adminMode.value
    ? [{ label: 'Name', value: 'name' }, { label: 'Slug', value: 'slug' }, { label: 'ID', value: 'id' }]
    : [{ label: 'Name', value: 'name' }, { label: 'Slug', value: 'slug' }, { label: 'ID', value: 'id' }],
)

// Selection
const selected = ref<Record<string, unknown>[]>([])
const showBulkDeleteDialog = ref(false)

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
  selected.value = []
  if (adminMode.value) {
    adminOrgsStore.fetchOrganizations({
      limit: rows,
      offset: first.value,
      ...(filterValue.value ? { [filterField.value]: filterValue.value } : {}),
    })
  } else {
    organizationsStore.fetchOrganizations()
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
  if (!adminMode.value) {
    organizationsStore.fetchUserInvitations()
  }
})

watch(adminMode, () => {
  first.value = 0
  filterField.value = 'name'
  filterValue.value = ''
  selected.value = []
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

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString()
}

const filteredOrganizations = computed(() => {
  if (adminMode.value) return displayOrganizations.value
  let orgs = organizationsStore.organizations
  if (filterValue.value) {
    const val = filterValue.value.toLowerCase()
    orgs = orgs.filter((o) => {
      const field = o[filterField.value as keyof typeof o]
      return field && String(field).toLowerCase().includes(val)
    })
  }
  return [...orgs].sort((a, b) => {
    const aPersonal = parseOrgMetadata(a.metadata).personal === true ? 0 : 1
    const bPersonal = parseOrgMetadata(b.metadata).personal === true ? 0 : 1
    return aPersonal - bPersonal
  })
})

async function handleBulkDelete() {
  for (const item of selected.value) {
    await organizationsStore.deleteOrganization(item.id as string)
  }
  selected.value = []
  showBulkDeleteDialog.value = false
  loadData()
}

async function handleAcceptInvitation(invitationId: string) {
  const ok = await organizationsStore.acceptInvitation(invitationId)
  if (ok) loadData()
}

async function handleRejectInvitation(invitationId: string) {
  await organizationsStore.rejectInvitation(invitationId)
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
        @click="showCreateDialog = true"
      >
        New organization
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
          @keyup.enter="adminMode ? applyFilters() : undefined"
        />
      </div>
      <Button
        v-if="adminMode"
        @click="applyFilters"
      >
        Apply
      </Button>
    </div>

    <Alert
      v-if="displayError"
      variant="destructive"
    >
      {{ displayError }}
    </Alert>

    <!-- Pending invitations (user mode only) -->
    <Card
      v-if="!adminMode && organizationsStore.userInvitations.length > 0"
    >
      <CardHeader>
        <CardTitle>Pending invitations</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          :value="organizationsStore.userInvitations"
          striped-rows
        >
          <Column
            field="organizationName"
            header="Organization"
          >
            <template #body="{ data }">
              <span class="font-medium text-[var(--app-fg)]">{{ data.organizationName }}</span>
            </template>
          </Column>
          <Column
            field="role"
            header="Role"
          >
            <template #body="{ data }">
              <Badge :variant="data.role === 'owner' ? 'destructive' : data.role === 'admin' ? 'warning' : 'info'">
                {{ data.role }}
              </Badge>
            </template>
          </Column>
          <Column header="Expires">
            <template #body="{ data }">
              <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.expiresAt) }}</span>
            </template>
          </Column>
          <Column
            header="Actions"
            style="width: 14rem"
          >
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button
                  size="sm"
                  @click="handleAcceptInvitation(data.id)"
                >
                  Accept
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-destructive hover:bg-destructive/10"
                  @click="handleRejectInvitation(data.id)"
                >
                  Decline
                </Button>
              </div>
            </template>
          </Column>
        </DataTable>
      </CardContent>
    </Card>

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
      :value="adminMode ? displayOrganizations : filteredOrganizations"
      :loading="displayLoading"
      data-key="id"
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
        selection-mode="multiple"
        header-style="width: 3rem"
      />
      <Column
        field="name"
        header="Name"
      >
        <template #body="{ data }">
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <RouterLink
                :to="adminMode
                  ? { name: 'settings-admin-organization-detail', params: { id: data.id } }
                  : { name: 'organization-detail', params: { id: data.id } }"
                class="font-medium text-[var(--app-link)] hover:underline"
              >
                {{ data.name }}
              </RouterLink>
              <Badge
                v-if="parseOrgMetadata(data.metadata).personal"
                variant="secondary"
              >
                Personal
              </Badge>
            </div>
            <span class="text-xs text-[var(--app-muted)] font-mono">{{ data.id }}</span>
          </div>
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
    </DataTable>

    <!-- Create dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:open="showCreateDialog"
    >
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="handleCreate">
          <p class="text-[var(--app-muted)] mb-4">
            Create a new organization.
          </p>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label for="create-name">Name</label>
              <Input
                id="create-name"
                v-model="createForm.name"
                placeholder="My organization"
                required
                minlength="2"
                maxlength="100"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="create-slug">Slug</label>
              <Input
                id="create-slug"
                v-model="createForm.slug"
                placeholder="my-organization"
                required
                minlength="2"
                maxlength="100"
                class="w-full"
              />
            </div>
            <Alert
              v-if="organizationsStore.error"
              variant="destructive"
            >
              {{ organizationsStore.error }}
            </Alert>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="secondary"
              @click="showCreateDialog = false"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              :loading="organizationsStore.loading"
            >
              {{ organizationsStore.loading ? 'Creating...' : 'Create' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Bulk delete dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:open="showBulkDeleteDialog"
    >
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete selected organizations</DialogTitle>
        </DialogHeader>
        <p class="text-[var(--app-muted)]">
          Are you sure you want to delete {{ selected.length }} organization(s)? This action cannot be undone.
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
            :loading="organizationsStore.loading"
            @click="handleBulkDelete"
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
