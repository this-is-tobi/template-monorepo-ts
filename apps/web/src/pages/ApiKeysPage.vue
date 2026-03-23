<script setup lang="ts">
import type { ApiKeyEntry, CreateApiKeyInput } from '~/stores/api-keys'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { onMounted, ref } from 'vue'
import { useApiKeysStore } from '~/stores/api-keys'

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

const apiKeysStore = useApiKeysStore()

const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const showKeyDialog = ref(false)
const keyToDelete = ref<ApiKeyEntry | null>(null)
const createdKey = ref('')

const createForm = ref<CreateApiKeyInput & { expiresIn?: number }>({
  name: '',
  permissions: {},
})

onMounted(() => {
  apiKeysStore.fetchApiKeys()
})

function openCreate() {
  createForm.value = { name: '', permissions: {} }
  showCreateDialog.value = true
}

function openDelete(key: ApiKeyEntry) {
  keyToDelete.value = key
  showDeleteDialog.value = true
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
  })
  if (result?.key) {
    createdKey.value = result.key
    showCreateDialog.value = false
    showKeyDialog.value = true
  }
}

async function handleDelete() {
  if (!keyToDelete.value) return
  const ok = await apiKeysStore.deleteApiKey(keyToDelete.value.id)
  if (ok) {
    keyToDelete.value = null
    showDeleteDialog.value = false
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
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
          API keys
        </h1>
        <p class="text-sm text-[var(--app-muted)]">
          Manage your personal API keys for programmatic access.
        </p>
      </div>
      <Button
        label="Create API key"
        @click="openCreate"
      />
    </div>

    <Message
      v-if="apiKeysStore.error"
      severity="error"
    >
      {{ apiKeysStore.error }}
    </Message>

    <DataTable
      :value="apiKeysStore.apiKeys"
      striped-rows
    >
      <template #empty>
        No API keys yet.
      </template>
      <Column
        field="name"
        header="Name"
      >
        <template #body="{ data }">
          <span class="font-medium text-[var(--app-fg)]">{{ data.name ?? '—' }}</span>
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
      <Column
        header="Actions"
        style="width: 6rem"
      >
        <template #body="{ data }">
          <Button
            label="Delete"
            text
            severity="danger"
            size="small"
            @click="openDelete(data)"
          />
        </template>
      </Column>
    </DataTable>

    <!-- Create API key dialog -->
    <Dialog
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

    <!-- Delete confirmation dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      modal
      header="Delete API key"
      :style="{ width: '28rem' }"
    >
      <p class="text-[var(--app-muted)] mb-4">
        Are you sure you want to delete the API key <strong>{{ keyToDelete?.name ?? 'unnamed' }}</strong>?
        Any applications using this key will stop working. This action cannot be undone.
      </p>
      <Message
        v-if="apiKeysStore.error"
        severity="error"
      >
        {{ apiKeysStore.error }}
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
          :loading="apiKeysStore.loading"
          @click="handleDelete"
        />
      </div>
    </Dialog>
  </div>
</template>
