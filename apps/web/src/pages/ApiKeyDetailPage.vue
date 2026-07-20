<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import MultiSelect from 'primevue/multiselect'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageSkeleton from '~/components/PageSkeleton.vue'
import { useOrgLookup } from '~/composables/useOrgLookup'
import { useUserLookup } from '~/composables/useUserLookup'
import { useAdminApiKeysStore } from '~/stores/admin-api-keys'
import { useApiKeysStore } from '~/stores/api-keys'
import { useOrganizationsStore } from '~/stores/organizations'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const router = useRouter()
const adminApiKeysStore = useAdminApiKeysStore()
const apiKeysStore = useApiKeysStore()
const userLookup = useUserLookup()
const orgLookup = useOrgLookup()
const projectsStore = useProjectsStore()
const organizationsStore = useOrganizationsStore()

const apiKeyId = route.params.id as string
const adminMode = computed(() => route.name === 'settings-admin-api-key-detail')

const loading = computed(() => adminMode.value ? adminApiKeysStore.loading : apiKeysStore.loading)
const error = computed(() => adminMode.value ? adminApiKeysStore.error : apiKeysStore.error)
const currentApiKey = computed(() => adminMode.value ? adminApiKeysStore.currentApiKey : apiKeysStore.currentApiKey)

const backRoute = computed(() => adminMode.value ? 'settings-admin-api-keys' : 'api-keys')
const backLabel = computed(() => adminMode.value ? '← All API keys' : '← API keys')

function tryParseJson(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string') return raw as Record<string, unknown> | null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

const permissionEntries = computed(() => {
  const key = currentApiKey.value
  if (!key) return []
  const perms = typeof key.permissions === 'string'
    ? tryParseJson(key.permissions) as Record<string, string[]> | null
    : key.permissions
  if (!perms) return []
  return Object.entries(perms)
})

const scopeOrgIds = computed<string[]>(() => {
  const raw = currentApiKey.value?.metadata
  if (!raw) return []
  const meta = tryParseJson(raw)
  if (!meta || !Array.isArray(meta.organizationIds)) return []
  return meta.organizationIds as string[]
})

const scopeProjectIds = computed<string[]>(() => {
  const raw = currentApiKey.value?.metadata
  if (!raw) return []
  const meta = tryParseJson(raw)
  if (!meta || !Array.isArray(meta.projectIds)) return []
  return meta.projectIds as string[]
})

const ownerName = computed(() => {
  const refId = adminApiKeysStore.currentApiKey?.referenceId
  return refId ? userLookup.getUserName(refId) : '—'
})

const ownerResolved = computed(() => {
  const refId = adminApiKeysStore.currentApiKey?.referenceId
  return refId ? userLookup.getUser(refId) : null
})

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

onMounted(async () => {
  if (adminMode.value) {
    await adminApiKeysStore.fetchApiKeyById(apiKeyId)
    if (adminApiKeysStore.currentApiKey?.referenceId) {
      userLookup.resolveUsers([adminApiKeysStore.currentApiKey.referenceId])
    }
  } else {
    await apiKeysStore.fetchApiKeyById(apiKeyId)
  }
  // Resolve scope references
  if (scopeOrgIds.value.length > 0) {
    orgLookup.resolveOrgs(scopeOrgIds.value)
  }
  if (scopeProjectIds.value.length > 0) {
    projectsStore.fetchProjects({ limit: 100 })
  }
})

const hasScope = computed(() => scopeOrgIds.value.length > 0 || scopeProjectIds.value.length > 0)

function getProjectName(id: string): string {
  return projectsStore.projects.find(p => p.id === id)?.name ?? id
}

// ---- Settings tab (user only) ---------------------------------------------
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

const editName = ref('')
const editPermissions = ref<Record<string, string[]>>({})
const editOrgIds = ref<string[]>([])
const editProjectIds = ref<string[]>([])
const saving = ref(false)
const savingPermissions = ref(false)

function syncEditForm() {
  if (!currentApiKey.value) return
  editName.value = currentApiKey.value.name ?? ''
  editPermissions.value = Object.fromEntries(permissionEntries.value.map(([r, a]) => [r, [...a]]))
  editOrgIds.value = [...scopeOrgIds.value]
  editProjectIds.value = [...scopeProjectIds.value]
}

watch(currentApiKey, () => syncEditForm(), { immediate: true })

onMounted(() => {
  if (!adminMode.value) {
    organizationsStore.fetchOrganizations()
    projectsStore.fetchProjects({ limit: 100 })
  }
})

function togglePermission(resource: string, action: string) {
  if (!editPermissions.value[resource]) {
    editPermissions.value[resource] = []
  }
  const actions = editPermissions.value[resource]
  const idx = actions.indexOf(action)
  if (idx === -1) {
    actions.push(action)
  } else {
    actions.splice(idx, 1)
    if (actions.length === 0) {
      delete editPermissions.value[resource]
    }
  }
}

function hasEditPermission(resource: string, action: string): boolean {
  return editPermissions.value[resource]?.includes(action) ?? false
}

async function handleSaveSettings() {
  saving.value = true
  const ok = await apiKeysStore.updateApiKey(apiKeyId, {
    name: editName.value,
  })
  saving.value = false
  return ok
}

async function handleSavePermissions() {
  savingPermissions.value = true
  const permissions = Object.keys(editPermissions.value).length > 0
    ? editPermissions.value
    : null
  const ok = await apiKeysStore.updateApiKey(apiKeyId, {
    permissions,
    organizationIds: editOrgIds.value,
    projectIds: editProjectIds.value,
  })
  if (ok && scopeOrgIds.value.length > 0) {
    orgLookup.resolveOrgs(scopeOrgIds.value)
  }
  savingPermissions.value = false
}

const showDeleteDialog = ref(false)

async function handleDelete() {
  await apiKeysStore.deleteApiKey(apiKeyId)
  if (!apiKeysStore.error) {
    showDeleteDialog.value = false
    router.push({ name: backRoute.value })
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="loading && !currentApiKey">
      <PageSkeleton />
    </div>

    <div
      v-else-if="error && !currentApiKey"
      class="flex flex-col gap-4"
    >
      <Message severity="error">
        {{ error }}
      </Message>
      <Button
        label="Back to API keys"
        outlined
        @click="router.push({ name: backRoute })"
      />
    </div>

    <template v-else-if="currentApiKey">
      <div class="flex items-center justify-between">
        <div>
          <Button
            :label="backLabel"
            text
            size="small"
            @click="router.push({ name: backRoute })"
          />
          <h1 class="text-3xl font-bold tracking-tight mt-2 text-[var(--app-fg)]">
            {{ currentApiKey.name ?? 'Unnamed key' }}
          </h1>
        </div>
      </div>

      <Tabs value="details">
        <TabList>
          <Tab value="details">
            Details
          </Tab>
          <Tab value="permissions">
            Permissions & Scope
          </Tab>
          <Tab
            v-if="!adminMode"
            value="settings"
          >
            Settings
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="details">
            <Card>
              <template #title>
                API key information
              </template>
              <template #content>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      ID
                    </p>
                    <p class="font-mono text-xs">
                      {{ currentApiKey.id }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Key prefix
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      <code class="text-sm">{{ currentApiKey.start ?? '••••' }}</code>
                    </p>
                  </div>
                  <div v-if="adminMode">
                    <p class="text-sm text-[var(--app-muted)]">
                      Owner
                    </p>
                    <div class="flex flex-col">
                      <RouterLink
                        v-if="ownerResolved"
                        :to="{ name: 'settings-admin-user-detail', params: { id: currentApiKey.referenceId } }"
                        class="font-medium text-[var(--app-link)] hover:underline"
                      >
                        {{ ownerName }}
                      </RouterLink>
                      <span
                        v-else
                        class="font-medium text-[var(--app-fg)]"
                      >{{ ownerName }}</span>
                      <span class="font-mono text-xs text-[var(--app-muted)]">{{ currentApiKey.referenceId }}</span>
                    </div>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Status
                    </p>
                    <Tag
                      :value="currentApiKey.enabled ? 'Active' : 'Disabled'"
                      :severity="currentApiKey.enabled ? 'success' : 'danger'"
                    />
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Expires
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ formatDate(currentApiKey.expiresAt) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Created
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ formatDate(currentApiKey.createdAt) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Updated
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ formatDate(currentApiKey.updatedAt) }}
                    </p>
                  </div>
                </div>
              </template>
            </Card>
          </TabPanel>

          <TabPanel value="permissions">
            <!-- Admin mode: read-only display -->
            <template v-if="adminMode">
              <Card class="mt-4">
                <template #title>
                  Permissions
                </template>
                <template #content>
                  <div
                    v-if="permissionEntries.length > 0"
                    class="flex flex-col gap-2"
                  >
                    <div
                      v-for="[resource, actions] in permissionEntries"
                      :key="resource"
                      class="flex items-center gap-2"
                    >
                      <span class="font-medium text-sm text-[var(--app-fg)] w-32">{{ resource }}</span>
                      <Tag
                        v-for="action in actions"
                        :key="action"
                        :value="action"
                        severity="info"
                      />
                    </div>
                  </div>
                  <p
                    v-else
                    class="text-[var(--app-muted)] text-sm"
                  >
                    All permissions (unrestricted)
                  </p>
                </template>
              </Card>

              <Card class="mt-4">
                <template #title>
                  Scope
                </template>
                <template #content>
                  <div
                    v-if="hasScope"
                    class="flex flex-col gap-4"
                  >
                    <div
                      v-if="scopeOrgIds.length > 0"
                      class="flex flex-col gap-2"
                    >
                      <p class="text-sm font-medium text-[var(--app-fg)]">
                        Organizations
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <Tag
                          v-for="orgId in scopeOrgIds"
                          :key="orgId"
                          :value="orgLookup.getOrgName(orgId)"
                          severity="info"
                        />
                      </div>
                    </div>
                    <div
                      v-if="scopeProjectIds.length > 0"
                      class="flex flex-col gap-2"
                    >
                      <p class="text-sm font-medium text-[var(--app-fg)]">
                        Projects
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <Tag
                          v-for="projId in scopeProjectIds"
                          :key="projId"
                          :value="getProjectName(projId)"
                          severity="info"
                        />
                      </div>
                    </div>
                  </div>
                  <p
                    v-else
                    class="text-[var(--app-muted)] text-sm"
                  >
                    Unrestricted — this key can access all organizations and projects.
                  </p>
                </template>
              </Card>
            </template>

            <!-- User mode: editable form -->
            <form
              v-else
              @submit.prevent="handleSavePermissions"
            >
              <Card class="mt-4">
                <template #title>
                  Permissions
                </template>
                <template #content>
                  <div class="flex flex-col gap-4">
                    <p class="text-xs text-[var(--app-muted)]">
                      Leave empty for unrestricted access. Select specific permissions to limit the key's capabilities.
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
                                :model-value="hasEditPermission(resource, action)"
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
                </template>
              </Card>

              <Card class="mt-4">
                <template #title>
                  Scope restrictions
                </template>
                <template #content>
                  <div class="flex flex-col gap-4 max-w-md">
                    <p class="text-xs text-[var(--app-muted)]">
                      Leave empty for unrestricted access. Select specific organizations or projects to limit the key's scope.
                    </p>
                    <div class="flex flex-col gap-1">
                      <label
                        for="edit-scope-orgs"
                        class="text-sm text-[var(--app-fg)]"
                      >Organizations</label>
                      <MultiSelect
                        id="edit-scope-orgs"
                        v-model="editOrgIds"
                        :options="organizationsStore.organizations"
                        option-label="name"
                        option-value="id"
                        placeholder="All organizations (unrestricted)"
                        :max-selected-labels="3"
                        filter
                        fluid
                      />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label
                        for="edit-scope-projects"
                        class="text-sm text-[var(--app-fg)]"
                      >Projects</label>
                      <MultiSelect
                        id="edit-scope-projects"
                        v-model="editProjectIds"
                        :options="projectsStore.projects"
                        option-label="name"
                        option-value="id"
                        placeholder="All projects (unrestricted)"
                        :max-selected-labels="3"
                        filter
                        fluid
                      />
                    </div>
                  </div>
                </template>
              </Card>

              <div class="mt-4">
                <Message
                  v-if="apiKeysStore.error"
                  severity="error"
                >
                  {{ apiKeysStore.error }}
                </Message>
                <div class="flex justify-end">
                  <Button
                    type="submit"
                    :label="savingPermissions ? 'Saving...' : 'Save changes'"
                    :loading="savingPermissions"
                  />
                </div>
              </div>
            </form>
          </TabPanel>

          <!-- Settings tab (user mode only) -->
          <TabPanel
            v-if="!adminMode"
            value="settings"
          >
            <form
              @submit.prevent="handleSaveSettings"
            >
              <Card class="mt-4">
                <template #title>
                  General
                </template>
                <template #content>
                  <div class="flex flex-col gap-4 max-w-md">
                    <div class="flex flex-col gap-1">
                      <label
                        class="text-sm text-[var(--app-fg)]"
                        for="edit-name"
                      >Name</label>
                      <InputText
                        id="edit-name"
                        v-model="editName"
                        required
                        fluid
                      />
                    </div>
                  </div>
                </template>
              </Card>

              <div class="mt-4">
                <Message
                  v-if="apiKeysStore.error"
                  severity="error"
                >
                  {{ apiKeysStore.error }}
                </Message>
                <div class="flex justify-end">
                  <Button
                    type="submit"
                    :label="saving ? 'Saving...' : 'Save changes'"
                    :loading="saving"
                  />
                </div>
              </div>
            </form>

            <Card class="mt-4">
              <template #title>
                <span class="text-red-600">Danger zone</span>
              </template>
              <template #content>
                <div class="flex items-center justify-between max-w-md">
                  <div>
                    <p class="text-sm font-medium text-[var(--app-fg)]">
                      Delete this API key
                    </p>
                    <p class="text-xs text-[var(--app-muted)]">
                      Any applications using this key will stop working. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    label="Delete"
                    severity="danger"
                    outlined
                    @click="showDeleteDialog = true"
                  />
                </div>
              </template>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <!-- Delete confirmation dialog -->
      <Dialog
        v-model:visible="showDeleteDialog"
        header="Delete API key"
        modal
        class="w-full max-w-md"
      >
        <p class="text-[var(--app-muted)]">
          Are you sure you want to delete <strong>{{ currentApiKey.name ?? 'this API key' }}</strong>? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-2 mt-6">
          <Button
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
    </template>
  </div>
</template>
