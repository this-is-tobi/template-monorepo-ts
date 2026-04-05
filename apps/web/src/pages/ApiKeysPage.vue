<script setup lang="ts">
import type { PageState } from 'primevue/paginator'
import type { CreateApiKeyInput } from '~/stores/api-keys'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

function openCreate() {
  createForm.value = { name: '', permissions: {}, organizationIds: [], projectIds: [] }
  organizationsStore.fetchOrganizations()
  projectsStore.fetchProjects()
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
        label="Create API key"
        @click="openCreate"
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

    <Message
      v-if="displayError"
      severity="error"
    >
      {{ displayError }}
    </Message>

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
          <Tag
            v-if="permissionCount(data.permissions) > 0"
            :value="`${permissionCount(data.permissions)} permission${permissionCount(data.permissions) !== 1 ? 's' : ''}`"
            severity="info"
          />
          <span
            v-else
            class="text-[var(--app-muted)] text-sm"
          >All (unrestricted)</span>
        </template>
      </Column>
      <Column header="Scope">
        <template #body="{ data }">
          <Tag
            v-if="scopeCount(data.metadata) > 0"
            :value="`${scopeCount(data.metadata)} restriction${scopeCount(data.metadata) !== 1 ? 's' : ''}`"
            severity="warn"
          />
          <span
            v-else
            class="text-[var(--app-muted)] text-sm"
          >Unrestricted</span>
        </template>
      </Column>
      <Column header="Status">
        <template #body="{ data }">
          <Tag
            :value="data.enabled ? 'Active' : 'Disabled'"
            :severity="data.enabled ? 'success' : 'danger'"
          />
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
      v-model:visible="showCreateDialog"
      modal
      header="Create API key"
      :style="{ width: '36rem' }"
    >
      <form @submit.prevent="handleCreate">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="apikey-name">Name</label>
            <InputText
              id="apikey-name"
              v-model="createForm.name"
              placeholder="e.g. CI pipeline, monitoring"
              required
              fluid
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
            <div class="border border-surface rounded-md overflow-auto max-h-80">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-surface bg-surface-50 dark:bg-surface-900">
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
                    class="border-b border-surface last:border-b-0"
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
                        :binary="true"
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
                  :max-selected-labels="3"
                  fluid
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
                  :max-selected-labels="3"
                  fluid
                />
              </div>
            </div>
          </div>
          <Message
            v-if="apiKeysStore.error"
            severity="error"
          >
            {{ apiKeysStore.error }}
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
            :label="apiKeysStore.loading ? 'Creating...' : 'Create key'"
            :loading="apiKeysStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Show created key dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:visible="showKeyDialog"
      modal
      header="API key created"
      :style="{ width: '32rem' }"
    >
      <div class="flex flex-col gap-4">
        <Message severity="warn">
          Copy this key now — it will not be shown again.
        </Message>
        <div class="flex items-center gap-2 p-3 bg-surface-100 dark:bg-surface-800 rounded-md">
          <code class="flex-1 text-sm font-mono break-all text-[var(--app-fg)]">{{ createdKey }}</code>
        </div>
      </div>
      <div class="flex justify-end mt-6">
        <Button
          label="Done"
          @click="showKeyDialog = false"
        />
      </div>
    </Dialog>

    <!-- Bulk delete dialog -->
    <Dialog
      v-if="!adminMode"
      v-model:visible="showBulkDeleteDialog"
      modal
      header="Delete selected API keys"
      class="w-full max-w-md"
    >
      <p class="text-[var(--app-muted)]">
        Are you sure you want to delete {{ selected.length }} API key(s)? Any applications using these keys will stop working. This action cannot be undone.
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
          :loading="apiKeysStore.loading"
          @click="handleBulkDelete"
        />
      </div>
    </Dialog>
  </div>
</template>
