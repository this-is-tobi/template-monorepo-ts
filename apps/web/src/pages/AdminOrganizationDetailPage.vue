<script setup lang="ts">
import { parseOrgMetadata } from '@template-monorepo-ts/shared'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrgMembersTable from '~/components/OrgMembersTable.vue'
import PageSkeleton from '~/components/PageSkeleton.vue'
import ProjectsTable from '~/components/ProjectsTable.vue'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Column, DataTable } from '~/components/ui/data-table'
import { Input } from '~/components/ui/input'
import { NumberInput } from '~/components/ui/number-input'
import { Select } from '~/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
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

async function onAuditPage(event: { first: number, rows: number }) {
  auditPage.value = Math.floor(event.first / auditPageSize)
  auditFilters.value.offset = auditPage.value * auditPageSize
  await loadOrgAuditLogs()
}

function auditActionSeverity(action: string) {
  if (action.includes('delete')) return 'destructive'
  if (action.includes('create')) return 'success'
  if (action.includes('update')) return 'warning'
  return 'info'
}

function formatAuditDetails(details: Record<string, unknown> | null | undefined) {
  if (!details) return '—'
  return JSON.stringify(details, null, 2)
}

onMounted(() => {
  adminOrgsStore.fetchOrganizationById(organizationId)
  loadProjects()
})

// Projects tab pagination
const projectsFirst = ref(0)
const projectsRows = 20

async function loadProjects() {
  await projectsStore.fetchProjects({
    organizationId,
    limit: projectsRows,
    offset: projectsFirst.value,
  })
}

async function onProjectsPage(event: { first: number, rows: number }) {
  projectsFirst.value = event.first
  await loadProjects()
}

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
      <PageSkeleton />
    </div>

    <div
      v-else-if="adminOrgsStore.error && !adminOrgsStore.currentOrganization"
      class="flex flex-col gap-4"
    >
      <Alert variant="destructive">
        {{ adminOrgsStore.error }}
      </Alert>
      <Button
        variant="outline"
        @click="router.push({ name: 'settings-admin-organizations' })"
      >
        &larr; All organizations
      </Button>
    </div>

    <template v-else-if="adminOrgsStore.currentOrganization">
      <div class="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            @click="router.push({ name: 'settings-admin-organizations' })"
          >
            &larr; All organizations
          </Button>
          <h1 class="text-3xl font-bold tracking-tight mt-2 text-[var(--app-fg)]">
            {{ adminOrgsStore.currentOrganization.name }}
          </h1>
          <p class="text-[var(--app-muted)]">
            {{ adminOrgsStore.currentOrganization.slug }}
          </p>
        </div>
      </div>

      <Tabs default-value="details">
        <TabsList>
          <TabsTrigger value="details">
            Details
          </TabsTrigger>
          <TabsTrigger value="members">
            Members ({{ adminOrgsStore.currentOrganization.members.length }})
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projects ({{ projectsStore.total }})
          </TabsTrigger>
          <TabsTrigger value="audit">
            Audit
          </TabsTrigger>
          <TabsTrigger value="settings">
            Settings
          </TabsTrigger>
        </TabsList>

        <!-- Details tab -->
        <TabsContent value="details">
          <Card class="mt-4">
            <CardContent class="p-6">
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
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Members tab -->
        <TabsContent value="members">
          <Card class="mt-4">
            <CardContent class="p-6">
              <OrgMembersTable
                :members="adminOrgsStore.currentOrganization.members"
                admin-links
              />
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Projects tab -->
        <TabsContent value="projects">
          <ProjectsTable
            :projects="projectsStore.projects"
            :loading="projectsStore.loading"
            :lazy="true"
            :paginator="true"
            :rows="projectsRows"
            :total="projectsStore.total"
            :first="projectsFirst"
            empty-message="No projects in this organization."
            class="mt-4"
            @page="onProjectsPage"
          />
        </TabsContent>

        <!-- Audit tab -->
        <TabsContent value="audit">
          <div class="flex flex-col gap-4 mt-4">
            <!-- Filters -->
            <div class="flex flex-wrap items-end gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-sm text-[var(--app-muted)]">Actor ID</label>
                <Input
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
                <Input
                  v-model="auditFilters.action"
                  placeholder="e.g. project:create"
                />
              </div>
              <Button
                @click="applyAuditFilters"
              >
                Apply
              </Button>
            </div>

            <Alert
              v-if="auditStore.error"
              variant="destructive"
            >
              {{ auditStore.error }}
            </Alert>

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
                  <Badge :variant="auditActionSeverity(data.action)">
                    {{ data.action }}
                  </Badge>
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
        </TabsContent>

        <!-- Settings tab -->
        <TabsContent value="settings">
          <Card class="mt-4">
            <CardHeader>
              <CardTitle>
                Quotas
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  <NumberInput
                    id="org-max-projects"
                    v-model="maxProjects"
                    :min="0"
                    class="w-full"
                  />
                </div>
                <Alert
                  v-if="saveError"
                  variant="destructive"
                >
                  {{ saveError }}
                </Alert>
                <div class="flex justify-end">
                  <Button
                    type="submit"
                    :loading="savingSettings"
                  >
                    {{ savingSettings ? 'Saving...' : 'Save changes' }}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </template>
  </div>
</template>
