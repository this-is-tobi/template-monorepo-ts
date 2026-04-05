<script setup lang="ts">
import type { DataTablePageEvent } from 'primevue/datatable'
import type { OrgRole } from '~/stores/roles'
import { parseOrgMetadata } from '@template-monorepo-ts/shared'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuditStore } from '~/stores/audit'
import { useAuthStore } from '~/stores/auth'
import { useOrganizationsStore } from '~/stores/organizations'
import { useProjectsStore } from '~/stores/projects'
import { useRolesStore } from '~/stores/roles'
import { useUserLookup } from '~/composables/useUserLookup'
import OrgMembersTable from '~/components/OrgMembersTable.vue'
import ProjectsTable from '~/components/ProjectsTable.vue'

const route = useRoute()
const router = useRouter()
const organizationsStore = useOrganizationsStore()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const rolesStore = useRolesStore()
const auditStore = useAuditStore()
const userLookup = useUserLookup()

const organizationId = route.params.id as string

const showInviteDialog = ref(false)
const showDeleteDialog = ref(false)
const showRoleDialog = ref(false)
const showCreateRoleDialog = ref(false)
const showEditRoleDialog = ref(false)
const showDeleteRoleDialog = ref(false)
const editForm = ref({ name: '' })
const inviteForm = ref({ email: '', role: 'member' })
const roleForm = ref({ memberId: '', memberName: '', role: '' })

const roleOptions = [
  { label: 'Member', value: 'member' },
  { label: 'Admin', value: 'admin' },
  { label: 'Owner', value: 'owner' },
]

// Roles management
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

const roleToDelete = ref<OrgRole | null>(null)
const createRoleForm = ref({ name: '', permission: {} as Record<string, string[]> })
const editRoleForm = ref({ id: '', name: '', permission: {} as Record<string, string[]> })

const predefinedRoles = ['owner', 'admin', 'member']
const customRoles = computed(() =>
  rolesStore.roles.filter(r => !predefinedRoles.includes(r.role)),
)

function togglePermission(
  form: { permission: Record<string, string[]> },
  resource: string,
  action: string,
) {
  if (!form.permission[resource]) {
    form.permission[resource] = []
  }
  const actions = form.permission[resource]
  const idx = actions.indexOf(action)
  if (idx === -1) {
    actions.push(action)
  } else {
    actions.splice(idx, 1)
    if (actions.length === 0) {
      delete form.permission[resource]
    }
  }
}

function hasPermission(
  permissions: Record<string, string[]>,
  resource: string,
  action: string,
): boolean {
  return permissions[resource]?.includes(action) ?? false
}

function permissionCount(permissions: Record<string, string[]>): number {
  return Object.values(permissions).reduce((sum, actions) => sum + actions.length, 0)
}

function openCreateRole() {
  createRoleForm.value = { name: '', permission: {} }
  showCreateRoleDialog.value = true
}

function openEditRole(role: OrgRole) {
  editRoleForm.value = {
    id: role.id,
    name: role.role,
    permission: JSON.parse(JSON.stringify(role.permission)),
  }
  showEditRoleDialog.value = true
}

function openDeleteRole(role: OrgRole) {
  roleToDelete.value = role
  showDeleteRoleDialog.value = true
}

async function handleCreateRole() {
  const result = await rolesStore.createRole(
    organizationId,
    createRoleForm.value.name,
    createRoleForm.value.permission,
  )
  if (result) showCreateRoleDialog.value = false
}

async function handleEditRole() {
  const result = await rolesStore.updateRole(
    organizationId,
    editRoleForm.value.id,
    { permission: editRoleForm.value.permission, roleName: editRoleForm.value.name },
  )
  if (result) showEditRoleDialog.value = false
}

async function handleDeleteRole() {
  if (!roleToDelete.value) return
  const ok = await rolesStore.deleteRole(organizationId, roleToDelete.value.id)
  if (ok) {
    roleToDelete.value = null
    showDeleteRoleDialog.value = false
  }
}

const currentUserMember = computed(() => {
  if (!organizationsStore.currentOrganization || !authStore.user) return null
  return organizationsStore.currentOrganization.members.find(m => m.userId === authStore.user!.id)
})

const isOwnerOrAdmin = computed(() => {
  const role = currentUserMember.value?.role
  return role === 'owner' || role === 'admin'
})

const isOwner = computed(() => currentUserMember.value?.role === 'owner')

const isPersonalOrg = computed(() => {
  const org = organizationsStore.currentOrganization
  if (!org) return false
  return parseOrgMetadata(org.metadata).personal === true
})

/**
 * True when the current user can read audit logs for this org.
 * Covers predefined roles (owner, admin) and any custom role with audit:read.
 * The API enforces this independently — this is only a UI hint.
 */
const canReadAudit = computed(() => {
  if (authStore.isAdmin) return true
  const role = currentUserMember.value?.role
  if (!role) return false
  if (role === 'owner' || role === 'admin') return true
  const orgRole = rolesStore.roles.find(r => r.role === role)
  return orgRole?.permission?.['audit']?.includes('read') ?? false
})

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

const pendingInvitations = computed(() => {
  return organizationsStore.currentOrganization?.invitations.filter(i => i.status === 'pending') ?? []
})

onMounted(() => {
  organizationsStore.fetchOrganization(organizationId)
  projectsStore.fetchProjects({ organizationId })
  rolesStore.fetchRoles(organizationId)
})

function syncEditForm() {
  if (!organizationsStore.currentOrganization) return
  editForm.value = { name: organizationsStore.currentOrganization.name }
}

async function handleSaveSettings() {
  if (!organizationsStore.currentOrganization) return
  savingSettings.value = true
  await organizationsStore.updateOrganization(organizationId, {
    name: editForm.value.name,
  })
  savingSettings.value = false
}

async function handleDelete() {
  const ok = await organizationsStore.deleteOrganization(organizationId)
  if (ok) router.push({ name: 'organizations' })
}

async function handleInvite() {
  const result = await organizationsStore.inviteMember(
    organizationId,
    inviteForm.value.email,
    inviteForm.value.role,
  )
  if (result) {
    inviteForm.value = { email: '', role: 'member' }
    showInviteDialog.value = false
    organizationsStore.fetchOrganization(organizationId)
  }
}

async function handleRemoveMember(memberIdOrUserId: string) {
  await organizationsStore.removeMember(memberIdOrUserId, organizationId)
}

function openRoleDialog(memberId: string, memberName: string, currentRole: string) {
  roleForm.value = { memberId, memberName, role: currentRole }
  showRoleDialog.value = true
}

async function handleRoleUpdate() {
  const ok = await organizationsStore.updateMemberRole(
    roleForm.value.memberId,
    roleForm.value.role,
    organizationId,
  )
  if (ok) showRoleDialog.value = false
}

async function handleCancelInvitation(invitationId: string) {
  await organizationsStore.cancelInvitation(invitationId)
}

function roleSeverity(role: string) {
  if (role === 'owner') return 'danger'
  if (role === 'admin') return 'warn'
  return 'info'
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleString()
}

const savingSettings = ref(false)

watch(() => organizationsStore.currentOrganization, (org) => {
  if (!org) return
  syncEditForm()
  // Load org-scoped audit logs once org data is available and user has permission
  if (canReadAudit.value) loadOrgAuditLogs()
})


</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="organizationsStore.loading && !organizationsStore.currentOrganization">
      <p class="text-[var(--app-muted)]">
        Loading...
      </p>
    </div>

    <div
      v-else-if="organizationsStore.error && !organizationsStore.currentOrganization"
      class="flex flex-col gap-4"
    >
      <Message severity="error">
        {{ organizationsStore.error }}
      </Message>
      <Button
        label="&larr; Organizations"
        outlined
        @click="router.push({ name: 'organizations' })"
      />
    </div>

    <template v-else-if="organizationsStore.currentOrganization">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <Button
              label="&larr; Organizations"
              text
              size="small"
              @click="router.push({ name: 'organizations' })"
            />
          </div>
          <h1 class="text-3xl font-bold tracking-tight mt-2 text-[var(--app-fg)]">
            {{ organizationsStore.currentOrganization.name }}
          </h1>
          <p class="text-[var(--app-muted)]">
            {{ organizationsStore.currentOrganization.slug }}
          </p>
        </div>
        <div
          v-if="isOwnerOrAdmin && !isPersonalOrg"
          class="flex gap-2"
        >
          <Button
            label="Invite member"
            outlined
            @click="showInviteDialog = true"
          />
        </div>
      </div>

      <Tabs value="details">
        <TabList>
          <Tab value="details">
            Details
          </Tab>
          <Tab
            v-if="!isPersonalOrg"
            value="members"
          >
            Members ({{ organizationsStore.currentOrganization.members.length }})
          </Tab>
          <Tab value="projects">
            Projects ({{ projectsStore.projects.length }})
          </Tab>
          <Tab
            v-if="isOwnerOrAdmin && !isPersonalOrg"
            value="roles"
          >
            Roles ({{ customRoles.length }})
          </Tab>
          <Tab
            v-if="canReadAudit"
            value="audit"
          >
            Audit
          </Tab>
          <Tab
            v-if="isOwnerOrAdmin"
            value="settings"
          >
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
                      Name
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ organizationsStore.currentOrganization.name }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Slug
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ organizationsStore.currentOrganization.slug }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Created
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ formatDate(organizationsStore.currentOrganization.createdAt) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Your role
                    </p>
                    <Tag
                      v-if="currentUserMember"
                      :value="currentUserMember.role"
                      :severity="roleSeverity(currentUserMember.role)"
                    />
                    <span
                      v-else
                      class="text-[var(--app-muted)]"
                    >—</span>
                  </div>
                </div>
              </template>
            </Card>
          </TabPanel>

          <!-- Members tab -->
          <TabPanel
            v-if="!isPersonalOrg"
            value="members"
          >
            <div class="flex flex-col gap-4 mt-4">
              <OrgMembersTable
                :members="organizationsStore.currentOrganization.members"
                :admin-links="authStore.isAdmin"
                :show-actions="isOwnerOrAdmin"
                :current-user-id="authStore.user?.id"
                @role-edit="openRoleDialog"
                @remove="handleRemoveMember"
              />

              <!-- Pending invitations -->
              <Card v-if="isOwnerOrAdmin && pendingInvitations.length > 0">
                <template #title>
                  Pending invitations
                </template>
                <template #content>
                  <DataTable
                    :value="pendingInvitations"
                    striped-rows
                  >
                    <Column
                      field="email"
                      header="Email"
                    >
                      <template #body="{ data }">
                        <span class="text-[var(--app-fg)]">{{ data.email }}</span>
                      </template>
                    </Column>
                    <Column
                      field="role"
                      header="Role"
                    >
                      <template #body="{ data }">
                        <Tag
                          :value="data.role"
                          :severity="roleSeverity(data.role)"
                        />
                      </template>
                    </Column>
                    <Column header="Expires">
                      <template #body="{ data }">
                        <span class="text-[var(--app-muted)]">{{ formatDate(data.expiresAt) }}</span>
                      </template>
                    </Column>
                    <Column
                      header="Actions"
                      style="width: 8rem"
                    >
                      <template #body="{ data }">
                        <Button
                          label="Cancel"
                          text
                          severity="danger"
                          size="small"
                          @click="handleCancelInvitation(data.id)"
                        />
                      </template>
                    </Column>
                  </DataTable>
                </template>
              </Card>
            </div>
          </TabPanel>

          <!-- Projects tab -->
          <TabPanel value="projects">
            <ProjectsTable
              :projects="projectsStore.projects"
              empty-message="No projects in this organization."
              class="mt-4"
            />
          </TabPanel>

          <!-- Roles tab -->
          <TabPanel
            v-if="isOwnerOrAdmin && !isPersonalOrg"
            value="roles"
          >
            <div class="flex flex-col gap-4 mt-4">
              <div class="flex justify-end">
                <Button
                  label="Create role"
                  @click="openCreateRole"
                />
              </div>

              <Message
                v-if="rolesStore.error"
                severity="error"
              >
                {{ rolesStore.error }}
              </Message>

              <DataTable
                :value="customRoles"
                striped-rows
              >
                <template #empty>
                  No custom roles defined yet.
                </template>
                <Column
                  field="role"
                  header="Name"
                >
                  <template #body="{ data }">
                    <span class="font-medium text-[var(--app-fg)]">{{ data.role }}</span>
                  </template>
                </Column>
                <Column header="Permissions">
                  <template #body="{ data }">
                    <Tag
                      :value="`${permissionCount(data.permission)} permission${permissionCount(data.permission) !== 1 ? 's' : ''}`"
                      severity="info"
                    />
                  </template>
                </Column>
                <Column header="Created">
                  <template #body="{ data }">
                    <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.createdAt) }}</span>
                  </template>
                </Column>
                <Column
                  header="Actions"
                  style="width: 10rem"
                >
                  <template #body="{ data }">
                    <div class="flex gap-2">
                      <Button
                        label="Edit"
                        text
                        size="small"
                        @click="openEditRole(data)"
                      />
                      <Button
                        label="Delete"
                        text
                        severity="danger"
                        size="small"
                        @click="openDeleteRole(data)"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

          <!-- Audit tab (owner/admin/custom roles with audit:read) -->
          <TabPanel
            v-if="canReadAudit"
            value="audit"
          >
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
                        :to="{ name: 'project-detail', params: { id: data.resourceId } }"
                        class="text-[var(--app-muted)] text-xs font-mono hover:underline"
                      >{{ data.resourceId }}</RouterLink>
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
                      <span
                        v-if="userLookup.getUser(data.actorId)"
                        class="text-[var(--app-fg)] text-sm"
                      >
                        {{ userLookup.getUserName(data.actorId) }}
                      </span>
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

          <!-- Settings tab (owner/admin) -->
          <TabPanel
            v-if="isOwnerOrAdmin"
            value="settings"
          >
            <Card class="mt-4">
              <template #title>
                General
              </template>
              <template #content>
                <form
                  class="flex flex-col gap-4 max-w-md"
                  @submit.prevent="handleSaveSettings"
                >
                  <div class="flex flex-col gap-1">
                    <label
                      class="text-sm text-[var(--app-fg)]"
                      for="edit-org-name"
                    >Name</label>
                    <InputText
                      id="edit-org-name"
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

            <Card
              v-if="isOwner"
              class="mt-4"
            >
              <template #title>
                <span class="text-red-600">Danger zone</span>
              </template>
              <template #content>
                <div class="flex items-center justify-between max-w-md">
                  <div>
                    <p class="text-sm font-medium text-[var(--app-fg)]">
                      Delete this organization
                    </p>
                    <p class="text-xs text-[var(--app-muted)]">
                      This will remove all members and invitations. This action cannot be undone.
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
    </template>

    <!-- Invite member dialog -->
    <Dialog
      v-model:visible="showInviteDialog"
      modal
      header="Invite member"
      :style="{ width: '28rem' }"
    >
      <form @submit.prevent="handleInvite">
        <p class="text-[var(--app-muted)] mb-4">
          Send an invitation to join this organization.
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="invite-email">Email</label>
            <InputText
              id="invite-email"
              v-model="inviteForm.email"
              type="email"
              placeholder="user@example.com"
              required
              fluid
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="invite-role">Role</label>
            <Select
              id="invite-role"
              v-model="inviteForm.role"
              :options="roleOptions"
              option-label="label"
              option-value="value"
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
            @click="showInviteDialog = false"
          />
          <Button
            type="submit"
            :label="organizationsStore.loading ? 'Inviting...' : 'Send invite'"
            :loading="organizationsStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Delete confirmation dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      modal
      header="Delete organization"
      :style="{ width: '28rem' }"
    >
      <p class="text-[var(--app-muted)] mb-4">
        Are you sure you want to delete <strong>{{ organizationsStore.currentOrganization?.name }}</strong>?
        This will remove all members and invitations. This action cannot be undone.
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

    <!-- Update member role dialog -->
    <Dialog
      v-model:visible="showRoleDialog"
      modal
      header="Update member role"
      :style="{ width: '28rem' }"
    >
      <form @submit.prevent="handleRoleUpdate">
        <p class="text-[var(--app-muted)] mb-4">
          Change role for <strong>{{ roleForm.memberName }}</strong>.
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="role-select">Role</label>
            <Select
              id="role-select"
              v-model="roleForm.role"
              :options="roleOptions"
              option-label="label"
              option-value="value"
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
            @click="showRoleDialog = false"
          />
          <Button
            type="submit"
            :label="organizationsStore.loading ? 'Updating...' : 'Update role'"
            :loading="organizationsStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Create role dialog -->
    <Dialog
      v-model:visible="showCreateRoleDialog"
      modal
      header="Create custom role"
      :style="{ width: '36rem' }"
    >
      <form @submit.prevent="handleCreateRole">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="create-role-name">Role name</label>
            <InputText
              id="create-role-name"
              v-model="createRoleForm.name"
              placeholder="e.g. editor, viewer"
              required
              fluid
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[var(--app-fg)]">Permissions</label>
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
                        :model-value="hasPermission(createRoleForm.permission, resource, action)"
                        :binary="true"
                        @update:model-value="togglePermission(createRoleForm, resource, action)"
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
            v-if="rolesStore.error"
            severity="error"
          >
            {{ rolesStore.error }}
          </Message>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            @click="showCreateRoleDialog = false"
          />
          <Button
            type="submit"
            :label="rolesStore.loading ? 'Creating...' : 'Create role'"
            :loading="rolesStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Edit role dialog -->
    <Dialog
      v-model:visible="showEditRoleDialog"
      modal
      header="Edit role"
      :style="{ width: '36rem' }"
    >
      <form @submit.prevent="handleEditRole">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="edit-role-name">Role name</label>
            <InputText
              id="edit-role-name"
              v-model="editRoleForm.name"
              required
              fluid
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-[var(--app-fg)]">Permissions</label>
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
                        :model-value="hasPermission(editRoleForm.permission, resource, action)"
                        :binary="true"
                        @update:model-value="togglePermission(editRoleForm, resource, action)"
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
            v-if="rolesStore.error"
            severity="error"
          >
            {{ rolesStore.error }}
          </Message>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            @click="showEditRoleDialog = false"
          />
          <Button
            type="submit"
            :label="rolesStore.loading ? 'Saving...' : 'Save changes'"
            :loading="rolesStore.loading"
          />
        </div>
      </form>
    </Dialog>

    <!-- Delete role confirmation dialog -->
    <Dialog
      v-model:visible="showDeleteRoleDialog"
      modal
      header="Delete role"
      :style="{ width: '28rem' }"
    >
      <p class="text-[var(--app-muted)] mb-4">
        Are you sure you want to delete the role <strong>{{ roleToDelete?.role }}</strong>?
        Members using this role will lose their custom permissions. This action cannot be undone.
      </p>
      <Message
        v-if="rolesStore.error"
        severity="error"
      >
        {{ rolesStore.error }}
      </Message>
      <div class="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          @click="showDeleteRoleDialog = false"
        />
        <Button
          label="Delete"
          severity="danger"
          :loading="rolesStore.loading"
          @click="handleDeleteRole"
        />
      </div>
    </Dialog>
  </div>
</template>
