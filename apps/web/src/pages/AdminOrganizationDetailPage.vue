<script setup lang="ts">
import type { DataTablePageEvent } from 'primevue/datatable'
import { parseOrgMetadata } from '@template-monorepo-ts/shared'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrgMembersTable from '~/components/OrgMembersTable.vue'
import ProjectsTable from '~/components/ProjectsTable.vue'
import { useUserLookup } from '~/composables/useUserLookup'
import { authClient } from '~/lib/auth'
import { useAdminOrganizationsStore } from '~/stores/admin-organizations'
import { useAuditStore } from '~/stores/audit'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const router = useRouter()
const adminOrgsStore = useAdminOrganizationsStore()
const projectsStore = useProjectsStore()
const auditStore = useAuditStore()
const userLookup = useUserLookup()

const organizationId = route.params.id as string

const maxProjects = ref<number | null>(null)
const savingSettings = ref(false)
const saveError = ref<string | null>(null)

// Audit tab state
const auditFilters = ref<{ actorId?: string, resourceType?: string, action?: string, limit: number, offset: number }>({
  limit: 50,
  offset: 0,
})
const auditPage = ref(0)
const auditPageSize = 50
const auditResourceTypeOptions = [
  { label: 'All', value: undefined },
  { label: 'Project', value: 'project' },
  { label: 'Organization', value: 'organization' },
  { label: 'User', value: 'user' },
  { label: 'Session', value: 'session' },
  { label: 'API key', value: 'apikey' },
  { label: 'Config', value: 'config' },
  { label: 'Theme', value: 'theme' },
  { label: 'Audit', value: 'audit' },
]

async function loadOrgAuditLogs() {
  await auditStore.fetchOrgLogs(organizationId, auditFilters.value)
  const ids = auditStore.entries.map(e => e.actorId).filter(Boolean) as string[]
  if (ids.length > 0) userLookup.resolveUsers(ids)
}

async function applyAuditFilters() {
  auditPage.value = 0
  auditFilters.value.offset = 0
  await loadOrgAuditLogs()
}

async function onAuditPage(event: DataTablePageEvent) {
  auditPage.value = event.page
  auditFilters.value.offset = event.page * auditPageSize
  await loadOrgAuditLogs()
}

function auditActionSeverity(action: string) {
  if (action.includes('delete')) return 'danger'
  if (action.includes('create')) return 'success'
  if (action.includes('update')) return 'warn'
  return 'info'
}

function formatAuditDetails(details: Record<string, unknown> | null | undefined) {
  if (!details) return '—'
  return JSON.stringify(details, null, 2)
}

onMounted(() => {
  adminOrgsStore.fetchOrganizationById(organizationId)
  projectsStore.fetchProjects({ organizationId })
})

// Personal orgs redirect to the owner's user detail page; load audit logs once org is ready.
watch(() => adminOrgsStore.currentOrganization, (org) => {
  if (!org) return
  const meta = parseOrgMetadata(org.metadata)
  if (meta.personal) {
    const owner = org.members.find(m => m.role === 'owner')
    if (owner) {
      router.replace({ name: 'settings-admin-user-detail', params: { id: owner.userId } })
      return
    }
  }
  maxProjects.value = meta.maxProjects ?? null
  loadOrgAuditLogs()
})

async function handleSaveSettings() {
  const org = adminOrgsStore.currentOrganization
  if (!org) return
  savingSettings.value = true
  saveError.value = null
  const meta = parseOrgMetadata(org.metadata) as Record<string, unknown>
  meta.maxProjects = maxProjects.value
  const { error } = await authClient.organization.update({
    organizationId,
    data: { metadata: meta },
  })
  if (error) {
    saveError.value = error.message ?? 'Failed to save settings'
  } else {
    await adminOrgsStore.fetchOrganizationById(organizationId)
  }
  savingSettings.value = false
}

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="adminOrgsStore.loading && !adminOrgsStore.currentOrganization">
      <p class="text-[var(--app-muted)]">
        Loading...
      </p>
    </div>

    <div
      v-else-if="adminOrgsStore.error && !adminOrgsStore.currentOrganization"
      class="flex flex-col gap-4"
    >
      <Message severity="error">
        {{ adminOrgsStore.error }}
      </Message>
      <Button
        label="&larr; All organizations"
        outlined
        @click="router.push({ name: 'settings-admin-organizations' })"
      />
    </div>

    <template v-else-if="adminOrgsStore.currentOrganization">
      <div class="flex items-center justify-between">
        <div>
          <Button
            label="&larr; All organizations"
            text
            size="small"
            @click="router.push({ name: 'settings-admin-organizations' })"
          />
          <h1 class="text-3xl font-bold tracking-tight mt-2 text-[var(--app-fg)]">
            {{ adminOrgsStore.currentOrganization.name }}
          </h1>
          <p class="text-[var(--app-muted)]">
            {{ adminOrgsStore.currentOrganization.slug }}
          </p>
        </div>
      </div>

      <Tabs value="details">
        <TabList>
          <Tab value="details">
            Details
          </Tab>
          <Tab value="members">
            Members ({{ adminOrgsStore.currentOrganization.members.length }})
          </Tab>
          <Tab value="projects">
            Projects ({{ projectsStore.projects.length }})
          </Tab>
          <Tab value="audit">
            Audit
          </Tab>
          <Tab value="settings">
            Settings
          </Tab>
        </TabList>

        <TabPanels>
          <!-- Details tab -->
          <TabPanel value="details">
            <Card class="mt-4">
              <template #content>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      ID
                    </p>
                    <p class="font-mono text-xs">
                      {{ adminOrgsStore.currentOrganization.id }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Name
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ adminOrgsStore.currentOrganization.name }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Slug
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ adminOrgsStore.currentOrganization.slug }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Created
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ formatDate(adminOrgsStore.currentOrganization.createdAt) }}
                    </p>
                  </div>
                </div>
              </template>
            </Card>
          </TabPanel>

          <!-- Members tab -->
          <TabPanel value="members">
            <Card class="mt-4">
              <template #content>
                <OrgMembersTable
                  :members="adminOrgsStore.currentOrganization.members"
                  admin-links
                />
              </template>
            </Card>
          </TabPanel>

          <!-- Projects tab -->
          <TabPanel value="projects">
            <ProjectsTable
              :projects="projectsStore.projects"
              empty-message="No projects in this organization."
              class="mt-4"
            />
          </TabPanel>

          <!-- Audit tab -->
          <TabPanel value="audit">
            <div class="flex flex-col gap-4 mt-4">
              <!-- Filters -->
              <div class="flex flex-wrap items-end gap-4">
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-[var(--app-muted)]">Actor ID</label>
                  <InputText
                    v-model="auditFilters.actorId"
                    placeholder="Filter by actor..."
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-[var(--app-muted)]">Resource type</label>
                  <Select
                    v-model="auditFilters.resourceType"
                    :options="auditResourceTypeOptions"
                    option-label="label"
                    option-value="value"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-[var(--app-muted)]">Action</label>
                  <InputText
                    v-model="auditFilters.action"
                    placeholder="e.g. project:create"
                  />
                </div>
                <Button
                  label="Apply"
                  @click="applyAuditFilters"
                />
              </div>

              <Message
                v-if="auditStore.error"
                severity="error"
              >
                {{ auditStore.error }}
              </Message>

              <DataTable
                :value="auditStore.entries"
                :loading="auditStore.loading"
                lazy
                paginator
                :rows="auditPageSize"
                :total-records="auditStore.total"
                :first="auditPage * auditPageSize"
                striped-rows
                @page="onAuditPage"
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
                    <Tag
                      :value="data.action"
                      :severity="auditActionSeverity(data.action)"
                    />
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
                        :to="{ name: 'settings-admin-project-detail', params: { id: data.resourceId } }"
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
                      <RouterLink
                        v-if="userLookup.getUser(data.actorId)"
                        :to="{ name: 'settings-admin-user-detail', params: { id: data.actorId } }"
                        class="text-[var(--app-fg)] text-sm hover:underline"
                      >
                        {{ userLookup.getUserName(data.actorId) }}
                      </RouterLink>
                      <span class="text-[var(--app-muted)] text-xs font-mono">{{ data.actorId }}</span>
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
                    ><code>{{ formatAuditDetails(data.details) }}</code></pre>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

          <!-- Settings tab -->
          <TabPanel value="settings">
            <Card class="mt-4">
              <template #title>
                Quotas
              </template>
              <template #content>
                <form
                  class="flex flex-col gap-4 max-w-md"
                  @submit.prevent="handleSaveSettings"
                >
                  <div class="flex flex-col gap-1">
                    <label
                      class="text-sm text-[var(--app-fg)]"
                      for="org-max-projects"
                    >Max projects</label>
                    <span class="text-xs text-[var(--app-muted)]">Maximum number of projects for this organization. Leave empty for unlimited.</span>
                    <InputNumber
                      id="org-max-projects"
                      v-model="maxProjects"
                      :min="0"
                      :allow-empty="true"
                      fluid
                    />
                  </div>
                  <Message
                    v-if="saveError"
                    severity="error"
                  >
                    {{ saveError }}
                  </Message>
                  <div class="flex justify-end">
                    <Button
                      type="submit"
                      :label="savingSettings ? 'Saving...' : 'Save changes'"
                      :loading="savingSettings"
                    />
                  </div>
                </form>
              </template>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>
</template>
