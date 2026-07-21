<script setup lang="ts">
import type { CreateApiKeyInput } from '~/stores/api-keys'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Column, DataTable } from '~/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { MultiSelect } from '~/components/ui/multi-select'
import { Select } from '~/components/ui/select'
import { useUserLookup } from '~/composables/useUserLookup'
import { useAdminApiKeysStore } from '~/stores/admin-api-keys'
import { useApiKeysStore } from '~/stores/api-keys'
import { useOrganizationsStore } from '~/stores/organizations'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const router = useRouter()
const apiKeysStore = useApiKeysStore()
const adminApiKeysStore = useAdminApiKeysStore()
const userLookup = useUserLookup()
const organizationsStore = useOrganizationsStore()
const projectsStore = useProjectsStore()

const adminMode = computed(() => !!route.meta.adminMode)

/** Available resources and their possible actions — mirrors the API access-control statements. */
const permissionMatrix: Record<string, string[]> = {
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  project: ['create', 'read', 'update', 'delete'],
  config: ['read', 'update'],
  theme: ['read', 'update'],
  audit: ['read'],
}

const resources = Object.keys(permissionMatrix)

const expirationOptions = [
  { label: 'Never', value: undefined },
  { label: '30 days', value: 30 * 24 * 60 * 60 },
  { label: '90 days', value: 90 * 24 * 60 * 60 },
  { label: '1 year', value: 365 * 24 * 60 * 60 },
]

const showCreateDialog = ref(false)
const showKeyDialog = ref(false)
const showBulkDeleteDialog = ref(false)
const createdKey = ref('')

const createForm = ref<CreateApiKeyInput & { expiresIn?: number }>({
  name: '',
  permissions: {},
})

// Search
const filterField = ref<string>('name')
const filterValue = ref('')
const rows = 20
const first = ref(0)

const searchFieldOptions = computed(() =>
  adminMode.value
    ? [{ label: 'Name', value: 'name' }, { label: 'Owner', value: 'referenceId' }, { label: 'ID', value: 'id' }]
    : [{ label: 'Name', value: 'name' }, { label: 'ID', value: 'id' }],
)

// Selection
const selected = ref<Record<string, unknown>[]>([])

const displayApiKeys = computed(() =>
  adminMode.value ? adminApiKeysStore.apiKeys : apiKeysStore.apiKeys,
)

const displayLoading = computed(() =>
  adminMode.value ? adminApiKeysStore.loading : apiKeysStore.loading,
)

const displayError = computed(() =>
  adminMode.value ? adminApiKeysStore.error : apiKeysStore.error,
)

function loadData() {
  selected.value = []
  if (adminMode.value) {
    adminApiKeysStore.fetchApiKeys({
      limit: rows,
      offset: first.value,
      ...(filterValue.value ? { [filterField.value]: filterValue.value } : {}),
    }).then(() => {
      const ids = adminApiKeysStore.apiKeys.map(k => k.referenceId).filter(Boolean) as string[]
      if (ids.length > 0) userLookup.resolveUsers(ids)
    })
  } else {
    apiKeysStore.fetchApiKeys()
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
})

watch(adminMode, () => {
  first.value = 0
  filterField.value = 'name'
  filterValue.value = ''
  selected.value = []
  loadData()
})

function openCreate() {
  createForm.value = { name: '', permissions: {}, organizationIds: [], projectIds: [] }
  organizationsStore.fetchOrganizations()
  projectsStore.fetchProjects({ limit: 100 })
  showCreateDialog.value = true
}

function togglePermission(resource: string, action: string) {
  const perms = createForm.value.permissions!
  if (!perms[resource]) {
    perms[resource] = []
  }
  const actions = perms[resource]
  const idx = actions.indexOf(action)
  if (idx === -1) {
    actions.push(action)
  } else {
    actions.splice(idx, 1)
    if (actions.length === 0) {
      delete perms[resource]
    }
  }
}

function hasPermission(resource: string, action: string): boolean {
  return createForm.value.permissions?.[resource]?.includes(action) ?? false
}

async function handleCreate() {
  const permissions = Object.keys(createForm.value.permissions ?? {}).length > 0
    ? createForm.value.permissions
    : undefined
  const result = await apiKeysStore.createApiKey({
    name: createForm.value.name,
    expiresIn: createForm.value.expiresIn,
    permissions,
    organizationIds: createForm.value.organizationIds,
    projectIds: createForm.value.projectIds,
  })
  if (result?.key) {
    createdKey.value = result.key
    showCreateDialog.value = false
    showKeyDialog.value = true
  }
}

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

function permissionCount(permissions: Record<string, string[]> | null | undefined): number {
  if (!permissions) return 0
  return Object.values(permissions).reduce((sum, actions) => sum + actions.length, 0)
}

function scopeCount(metadata: Record<string, unknown> | null | undefined): number {
  if (!metadata) return 0
  const orgIds = Array.isArray(metadata.organizationIds) ? metadata.organizationIds.length : 0
  const projIds = Array.isArray(metadata.projectIds) ? metadata.projectIds.length : 0
  return orgIds + projIds
}

const filteredUserApiKeys = computed(() => {
  if (adminMode.value) return displayApiKeys.value
  if (!filterValue.value) return apiKeysStore.apiKeys
  const val = filterValue.value.toLowerCase()
  return apiKeysStore.apiKeys.filter((k) => {
    const field = k[filterField.value as keyof typeof k]
    return field && String(field).toLowerCase().includes(val)
  })
})

async function handleBulkDelete() {
  for (const item of selected.value) {
    await apiKeysStore.deleteApiKey(item.id as string)
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
          {{ adminMode ? 'All API keys' : 'API keys' }}
        </h1>
        <p class="text-sm text-[var(--app-muted)]">
          {{ adminMode ? 'View all API keys across the platform' : 'Manage your personal API keys for programmatic access.' }}
        </p>
      </div>
      <Button
        v-if="!adminMode"
        @click="openCreate"
      >
        Create API key
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
      :value="adminMode ? displayApiKeys : filteredUserApiKeys"
      :loading="displayLoading"
      data-key="id"
      striped-rows
      :lazy="adminMode"
      :paginator="adminMode"
      :rows="rows"
      :total-records="adminApiKeysStore.total"
      :first="first"
      @page="onPage"
    >
      <template #empty>
        No API keys yet.
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
            <router-link
              v-if="adminMode"
              :to="{ name: 'settings-admin-api-key-detail', params: { id: data.id } }"
              class="font-medium text-[var(--app-link)] hover:underline"
            >
              {{ data.name ?? '—' }}
            </router-link>
            <button
              v-else
              class="font-medium text-[var(--app-link)] hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
              @click="router.push({ name: 'api-key-detail', params: { id: data.id } })"
            >
              {{ data.name ?? '—' }}
            </button>
            <span class="text-xs text-[var(--app-muted)] font-mono">{{ data.id }}</span>
          </div>
        </template>
      </Column>
      <Column
        v-if="adminMode"
        header="Owner"
      >
        <template #body="{ data }">
          <div class="flex flex-col">
            <span class="font-medium text-[var(--app-fg)]">{{ userLookup.getUserName(data.referenceId) }}</span>
            <span
              v-if="userLookup.getUser(data.referenceId)"
              class="text-xs text-[var(--app-muted)] font-mono"
            >{{ data.referenceId }}</span>
          </div>
        </template>
      </Column>
      <Column header="Key prefix">
        <template #body="{ data }">
          <code class="text-sm text-[var(--app-muted)]">{{ data.start ?? '••••' }}</code>
        </template>
      </Column>
      <Column header="Permissions">
        <template #body="{ data }">
          <Badge
            v-if="permissionCount(data.permissions) > 0"
            variant="info"
          >
            {{ `${permissionCount(data.permissions)} permission${permissionCount(data.permissions) !== 1 ? 's' : ''}` }}
          </Badge>
          <span
            v-else
            class="text-[var(--app-muted)] text-sm"
          >All (unrestricted)</span>
        </template>
      </Column>
      <Column header="Scope">
        <template #body="{ data }">
          <Badge
            v-if="scopeCount(data.metadata) > 0"
            variant="warning"
          >
            {{ `${scopeCount(data.metadata)} restriction${scopeCount(data.metadata) !== 1 ? 's' : ''}` }}
          </Badge>
          <span
            v-else
            class="text-[var(--app-muted)] text-sm"
          >Unrestricted</span>
        </template>
      </Column>
      <Column header="Status">
        <template #body="{ data }">
          <Badge :variant="data.enabled ? 'success' : 'destructive'">
            {{ data.enabled ? 'Active' : 'Disabled' }}
          </Badge>
        </template>
      </Column>
      <Column header="Expires">
        <template #body="{ data }">
          <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.expiresAt) }}</span>
        </template>
      </Column>
      <Column header="Created">
        <template #body="{ data }">
          <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>
    </DataTable>

    <!-- Create API key dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:open="showCreateDialog"
    >
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="handleCreate">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label for="apikey-name">Name</label>
              <Input
                id="apikey-name"
                v-model="createForm.name"
                placeholder="e.g. CI pipeline, monitoring"
                required
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="apikey-expiration">Expiration</label>
              <Select
                id="apikey-expiration"
                v-model="createForm.expiresIn"
                :options="expirationOptions"
                option-label="label"
                option-value="value"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-[var(--app-fg)]">Permissions (optional)</label>
              <p class="text-xs text-[var(--app-muted)]">
                Leave empty for unrestricted access. Select specific permissions to limit the key's scope.
              </p>
              <div class="border border-border rounded-md overflow-auto max-h-80">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-border bg-surface-50 dark:bg-surface-900">
                      <th class="text-left px-3 py-2 font-medium text-[var(--app-muted)]">
                        Resource
                      </th>
                      <th
                        v-for="action in ['create', 'read', 'update', 'delete']"
                        :key="action"
                        class="px-3 py-2 font-medium text-[var(--app-muted)] text-center"
                      >
                        {{ action }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="resource in resources"
                      :key="resource"
                      class="border-b border-border last:border-b-0"
                    >
                      <td class="px-3 py-2 font-medium text-[var(--app-fg)]">
                        {{ resource }}
                      </td>
                      <td
                        v-for="action in ['create', 'read', 'update', 'delete']"
                        :key="action"
                        class="px-3 py-2 text-center"
                      >
                        <Checkbox
                          v-if="permissionMatrix[resource]?.includes(action)"
                          :model-value="hasPermission(resource, action)"
                          @update:model-value="togglePermission(resource, action)"
                        />
                        <span
                          v-else
                          class="text-[var(--app-muted)]"
                        >—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-[var(--app-fg)]">Scope restrictions (optional)</label>
              <p class="text-xs text-[var(--app-muted)]">
                Leave empty for unrestricted access. Select specific organizations or projects to limit the key's scope.
              </p>
              <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-1">
                  <label
                    for="scope-orgs"
                    class="text-sm text-[var(--app-muted)]"
                  >Organizations</label>
                  <MultiSelect
                    id="scope-orgs"
                    v-model="createForm.organizationIds"
                    :options="organizationsStore.organizations"
                    option-label="name"
                    option-value="id"
                    placeholder="All organizations (unrestricted)"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    for="scope-projects"
                    class="text-sm text-[var(--app-muted)]"
                  >Projects</label>
                  <MultiSelect
                    id="scope-projects"
                    v-model="createForm.projectIds"
                    :options="projectsStore.projects"
                    option-label="name"
                    option-value="id"
                    placeholder="All projects (unrestricted)"
                    class="w-full"
                  />
                </div>
              </div>
            </div>
            <Alert
              v-if="apiKeysStore.error"
              variant="destructive"
            >
              {{ apiKeysStore.error }}
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
              :loading="apiKeysStore.loading"
            >
              {{ apiKeysStore.loading ? 'Creating...' : 'Create key' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Show created key dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:open="showKeyDialog"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API key created</DialogTitle>
        </DialogHeader>
        <div class="flex flex-col gap-4">
          <Alert variant="warning">
            Copy this key now — it will not be shown again.
          </Alert>
          <div class="flex items-center gap-2 p-3 bg-surface-100 dark:bg-surface-800 rounded-md">
            <code class="flex-1 text-sm font-mono break-all text-[var(--app-fg)]">{{ createdKey }}</code>
          </div>
        </div>
        <div class="flex justify-end mt-6">
          <Button @click="showKeyDialog = false">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Bulk delete dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:open="showBulkDeleteDialog"
    >
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete selected API keys</DialogTitle>
        </DialogHeader>
        <p class="text-[var(--app-muted)]">
          Are you sure you want to delete {{ selected.length }} API key(s)? Any applications using these keys will stop working. This action cannot be undone.
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
            :loading="apiKeysStore.loading"
            @click="handleBulkDelete"
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
