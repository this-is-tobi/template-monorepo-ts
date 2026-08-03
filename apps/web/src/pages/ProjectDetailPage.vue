<script setup lang="ts">
import { PROJECT_ROLE_NAMES, PROJECT_ROLES, roleGrants } from '@template-monorepo-ts/shared'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageSkeleton from '~/components/PageSkeleton.vue'
import ProjectServiceKeys from '~/components/project/ProjectServiceKeys.vue'
import RolePermissionMatrix from '~/components/RolePermissionMatrix.vue'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Column, DataTable } from '~/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Textarea } from '~/components/ui/textarea'
import { useConfirm } from '~/composables/useConfirm'
import { useNotify } from '~/composables/useNotify'
import { useAuthStore } from '~/stores/auth'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const notify = useNotify()
const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const showDeleteDialog = ref(false)
const showAddMemberDialog = ref(false)
const showRoleDialog = ref(false)
const editForm = ref({ name: '', description: '' })
const addMemberForm = ref({ email: '', role: 'member' })
const roleForm = ref({ memberId: '', memberName: '', role: '' })

// Member pagination
const membersFirst = ref(0)
const membersRows = 20

const projectId = route.params.id as string

/**
 * Assignable roles, straight from the shared table so a new role shows up here
 * the moment it exists server-side.
 *
 * `owner` is absent on purpose: it is not a roster role but the project's
 * `ownerId`, and handing it out from this dropdown would create a second owner
 * the server does not recognise.
 */
const memberRoleOptions = PROJECT_ROLE_NAMES
  .filter(role => role !== 'owner')
  .map(role => ({ label: role[0]!.toUpperCase() + role.slice(1), value: role }))

const isProjectOwner = computed(() => {
  return projectsStore.currentProject?.ownerId === authStore.user?.id
})

/** The caller's own role on this project, as the server would resolve it. */
const myRole = computed(() => {
  if (isProjectOwner.value) return 'owner'
  return projectsStore.members.find(m => m.userId === authStore.user?.id)?.role ?? null
})

/**
 * How the caller comes by their access — worth saying out loud, because
 * "you can do this because you are a platform admin" and "…because you are a
 * viewer here" look identical from the buttons alone.
 */
const myAccessSummary = computed(() => {
  if (myRole.value) return PROJECT_ROLES[myRole.value as keyof typeof PROJECT_ROLES]?.summary ?? ''
  if (authStore.isAdmin) return 'Platform administrators can reach every project.'
  return 'You can see this project through your organization, without a role on it.'
})

/**
 * Who may mint or revoke a service key.
 *
 * Read off the shared role table rather than a hand-written list of role
 * names, so this tracks whatever the server will actually enforce for
 * `service-key:create` — including any role added later.
 */
const canManageProject = computed(() => {
  if (authStore.isAdmin) return true
  return roleGrants(myRole.value ?? '', 'service-key', 'create')
})

/** Who may change the roster — `project:manage-members`, same source. */
const canManageMembers = computed(() => {
  if (authStore.isAdmin) return true
  return roleGrants(myRole.value ?? '', 'project', 'manage-members')
})

onMounted(async () => {
  await projectsStore.fetchProject(projectId)
  await projectsStore.fetchMembers(projectId, { limit: membersRows, offset: membersFirst.value })
  syncEditForm()
})

function syncEditForm() {
  if (!projectsStore.currentProject) return
  editForm.value = {
    name: projectsStore.currentProject.name,
    description: projectsStore.currentProject.description ?? '',
  }
}

async function handleEdit() {
  const ok = await projectsStore.updateProject(projectId, {
    name: editForm.value.name,
    description: editForm.value.description || null,
  })
  if (ok) notify.success('Project updated')
}

async function handleDelete() {
  const ok = await projectsStore.deleteProject(projectId)
  if (ok) {
    notify.success('Project deleted')
    router.push({ name: 'projects' })
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

async function handleAddMember() {
  const email = addMemberForm.value.email
  const ok = await projectsStore.addMember(projectId, {
    email,
    role: addMemberForm.value.role as 'admin' | 'member' | 'viewer',
  }, { limit: membersRows, offset: membersFirst.value })
  if (ok) {
    notify.success('Member added', email)
    addMemberForm.value = { email: '', role: 'member' }
    showAddMemberDialog.value = false
  }
}

function openRoleDialog(memberId: string, memberName: string, currentRole: string) {
  roleForm.value = { memberId, memberName: memberName || memberId, role: currentRole }
  showRoleDialog.value = true
}

async function handleRoleUpdate() {
  const ok = await projectsStore.updateMember(projectId, roleForm.value.memberId, {
    role: roleForm.value.role as 'admin' | 'member' | 'viewer',
  }, { limit: membersRows, offset: membersFirst.value })
  if (ok) {
    notify.success('Role updated', `${roleForm.value.memberName} → ${roleForm.value.role}`)
    showRoleDialog.value = false
  }
}

function confirmRemoveMember(memberId: string, memberName: string) {
  confirm.require({
    header: 'Remove member',
    message: `Remove ${memberName || 'this member'} from the project?`,
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Remove', severity: 'danger' },
    accept: () => handleRemoveMember(memberId, memberName),
  })
}

async function handleRemoveMember(memberId: string, memberName?: string) {
  await projectsStore.removeMember(projectId, memberId)
  notify.success('Member removed', memberName)
  // If we removed the last item on this page, go back one page
  if (projectsStore.members.length === 0 && membersFirst.value > 0) {
    membersFirst.value = Math.max(0, membersFirst.value - membersRows)
  }
  await projectsStore.fetchMembers(projectId, { limit: membersRows, offset: membersFirst.value })
}

async function onMembersPage(event: { first: number, rows: number }) {
  membersFirst.value = event.first
  await projectsStore.fetchMembers(projectId, { limit: membersRows, offset: membersFirst.value })
}

function roleSeverity(role: string) {
  if (role === 'owner') return 'destructive'
  if (role === 'admin') return 'warning'
  return 'info'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="projectsStore.loading && !projectsStore.currentProject">
      <PageSkeleton />
    </div>

    <div
      v-else-if="projectsStore.error && !projectsStore.currentProject"
      class="flex flex-col gap-4"
    >
      <Alert variant="destructive">
        {{ projectsStore.error }}
      </Alert>
      <Button
        variant="outline"
        @click="router.push({ name: 'projects' })"
      >
        Back to projects
      </Button>
    </div>

    <template v-else-if="projectsStore.currentProject">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              @click="router.push({ name: 'projects' })"
            >
              &larr; Projects
            </Button>
          </div>
          <h1 class="text-3xl font-bold tracking-tight mt-2 text-[var(--app-fg)]">
            {{ projectsStore.currentProject.name }}
          </h1>
          <p
            v-if="projectsStore.currentProject.description"
            class="text-[var(--app-muted)]"
          >
            {{ projectsStore.currentProject.description }}
          </p>
        </div>
      </div>

      <Tabs default-value="details">
        <TabsList>
          <TabsTrigger value="details">
            Details
          </TabsTrigger>
          <TabsTrigger value="members">
            Members ({{ projectsStore.totalMembers }})
          </TabsTrigger>
          <TabsTrigger value="roles">
            Roles
          </TabsTrigger>
          <TabsTrigger
            v-if="canManageProject"
            value="service-keys"
          >
            Service keys
          </TabsTrigger>
          <TabsTrigger
            v-if="isProjectOwner"
            value="settings"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        <!-- Roles tab — the reference, and where you check your own standing -->
        <TabsContent value="roles">
          <!-- Answers "why can't I do X here?", which the buttons alone never
               do: a viewer and a member see the same greyed-out page. -->
          <Card class="mb-4">
            <CardHeader>
              <CardTitle>Your access</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="flex items-center gap-2">
                <Badge v-if="myRole" :variant="roleSeverity(myRole)">
                  {{ myRole }}
                </Badge>
                <Badge v-else-if="authStore.isAdmin" variant="warning">
                  platform admin
                </Badge>
                <Badge v-else variant="secondary">
                  no role
                </Badge>
                <span class="text-sm text-[var(--app-muted)]">{{ myAccessSummary }}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project roles</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-[var(--app-muted)] mb-4">
                What each role on this project can do. A member's role is added to whatever their
                organization role already grants, so it can widen their access but never narrow it.
              </p>
              <RolePermissionMatrix scope="project" :highlight="myRole" />
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Service keys tab -->
        <TabsContent v-if="canManageProject" value="service-keys">
          <ProjectServiceKeys :project-id="projectId" :can-manage="canManageProject" />
        </TabsContent>

        <!-- Details tab -->
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>
                Project information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-[var(--app-muted)]">
                    ID
                  </p>
                  <p class="font-mono text-xs">
                    {{ projectsStore.currentProject.id }}
                  </p>
                </div>
                <div>
                  <p class="text-sm text-[var(--app-muted)]">
                    Owner
                  </p>
                  <div>
                    <router-link
                      v-if="projectsStore.currentProject.owner && authStore.isAdmin"
                      :to="{ name: 'settings-admin-user-detail', params: { id: projectsStore.currentProject.ownerId } }"
                      class="font-medium text-[var(--app-link)] hover:underline"
                    >
                      {{ projectsStore.currentProject.owner.name }}
                    </router-link>
                    <span
                      v-else-if="projectsStore.currentProject.owner"
                      class="font-medium text-[var(--app-fg)]"
                    >{{ projectsStore.currentProject.owner.name }}</span>
                    <p class="font-mono text-xs text-[var(--app-muted)]">
                      {{ projectsStore.currentProject.ownerId }}
                    </p>
                  </div>
                </div>
                <div>
                  <p class="text-sm text-[var(--app-muted)]">
                    Description
                  </p>
                  <p class="font-medium text-[var(--app-fg)]">
                    {{ projectsStore.currentProject.description || '—' }}
                  </p>
                </div>
                <div>
                  <p class="text-sm text-[var(--app-muted)]">
                    Created
                  </p>
                  <p class="font-medium text-[var(--app-fg)]">
                    {{ formatDate(projectsStore.currentProject.createdAt) }}
                  </p>
                </div>
                <div>
                  <p class="text-sm text-[var(--app-muted)]">
                    Updated
                  </p>
                  <p class="font-medium text-[var(--app-fg)]">
                    {{ formatDate(projectsStore.currentProject.updatedAt) }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Members tab -->
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>
                <div class="flex items-center justify-between">
                  <span>Members</span>
                  <Button
                    v-if="canManageMembers"
                    variant="outline"
                    size="sm"
                    @click="showAddMemberDialog = true"
                  >
                    Add member
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                :value="projectsStore.members"
                :loading="projectsStore.loading"
                striped-rows
                lazy
                paginator
                :rows="membersRows"
                :total-records="projectsStore.totalMembers"
                :first="membersFirst"
                @page="onMembersPage"
              >
                <template #empty>
                  No members yet.
                </template>
                <Column
                  field="userId"
                  header="User"
                >
                  <template #body="{ data }">
                    <div class="flex flex-col">
                      <router-link
                        v-if="authStore.isAdmin && data.user?.name"
                        :to="{ name: 'settings-admin-user-detail', params: { id: data.userId } }"
                        class="font-medium text-[var(--app-link)] hover:underline"
                      >
                        {{ data.user.name }}
                      </router-link>
                      <span v-else class="font-medium text-[var(--app-fg)]">{{ data.user?.name ?? data.userId }}</span>
                      <span v-if="data.user" class="text-xs text-[var(--app-muted)] font-mono">{{ data.userId }}</span>
                    </div>
                  </template>
                </Column>
                <Column
                  field="role"
                  header="Role"
                >
                  <template #body="{ data }">
                    <Badge :variant="roleSeverity(data.role)">
                      {{ data.role }}
                    </Badge>
                  </template>
                </Column>
                <Column header="Joined">
                  <template #body="{ data }">
                    <span class="text-[var(--app-muted)]">{{ formatDate(data.createdAt) }}</span>
                  </template>
                </Column>
                <Column
                  v-if="canManageMembers"
                  header="Actions"
                  style="width: 12rem"
                >
                  <template #body="{ data }">
                    <div
                      v-if="data.role !== 'owner'"
                      class="flex gap-2"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        @click="openRoleDialog(data.id, data.user?.name ?? data.userId, data.role)"
                      >
                        Role
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="text-destructive hover:bg-destructive/10"
                        @click="confirmRemoveMember(data.id, data.user?.name ?? data.user?.email ?? '')"
                      >
                        Remove
                      </Button>
                    </div>
                  </template>
                </Column>
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
        <!-- Settings tab -->
        <TabsContent
          v-if="isProjectOwner"
          value="settings"
        >
          <Card class="mt-4">
            <CardHeader>
              <CardTitle>
                General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                class="flex flex-col gap-4 max-w-md"
                @submit.prevent="handleEdit"
              >
                <div class="flex flex-col gap-1">
                  <label
                    class="text-sm text-[var(--app-fg)]"
                    for="edit-name"
                  >Name</label>
                  <Input
                    id="edit-name"
                    v-model="editForm.name"
                    required
                    minlength="3"
                    maxlength="100"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label
                    class="text-sm text-[var(--app-fg)]"
                    for="edit-description"
                  >Description</label>
                  <Textarea
                    id="edit-description"
                    v-model="editForm.description"
                    maxlength="500"
                    :rows="3"
                    class="w-full"
                  />
                </div>
                <Alert
                  v-if="projectsStore.error"
                  variant="destructive"
                >
                  {{ projectsStore.error }}
                </Alert>
                <div class="flex justify-end">
                  <Button
                    type="submit"
                    :loading="projectsStore.loading"
                  >
                    {{ projectsStore.loading ? 'Saving...' : 'Save changes' }}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card class="mt-4">
            <CardHeader>
              <CardTitle>
                <span class="text-red-600">Danger zone</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="flex items-center justify-between max-w-md">
                <div>
                  <p class="text-sm font-medium text-[var(--app-fg)]">
                    Delete this project
                  </p>
                  <p class="text-xs text-[var(--app-muted)]">
                    This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="outline"
                  class="text-destructive border-destructive/40 hover:bg-destructive/10"
                  @click="showDeleteDialog = true"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <!-- Delete confirmation dialog -->
      <Dialog v-model:open="showDeleteDialog">
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
          </DialogHeader>
          <p class="text-[var(--app-muted)]">
            Are you sure you want to delete "{{ projectsStore.currentProject.name }}"? This action cannot be undone.
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="secondary"
              @click="showDeleteDialog = false"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              :loading="projectsStore.loading"
              @click="handleDelete"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <!-- Add member dialog -->
      <Dialog v-model:open="showAddMemberDialog">
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>
          <form @submit.prevent="handleAddMember">
            <p class="text-[var(--app-muted)] mb-4">
              Add a collaborator to this project by their email address.
            </p>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <label for="member-email">Email</label>
                <Input
                  id="member-email"
                  v-model="addMemberForm.email"
                  type="email"
                  required
                  placeholder="Enter email address"
                  class="w-full"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label for="member-role">Role</label>
                <Select
                  id="member-role"
                  v-model="addMemberForm.role"
                  :options="memberRoleOptions"
                  option-label="label"
                  option-value="value"
                />
                <!-- Shown against the alternatives, not alone: the useful
                     question is not "what is a member" but "what does member
                     get that viewer does not". -->
                <RolePermissionMatrix
                  class="mt-2"
                  scope="project"
                  :highlight="addMemberForm.role"
                  hide-descriptions
                />
              </div>
              <Alert
                v-if="projectsStore.error"
                variant="destructive"
              >
                {{ projectsStore.error }}
              </Alert>
            </div>
            <div class="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="secondary"
                @click="showAddMemberDialog = false"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                :loading="projectsStore.loading"
              >
                {{ projectsStore.loading ? 'Adding...' : 'Add member' }}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <!-- Update role dialog -->
      <Dialog v-model:open="showRoleDialog">
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle>Update member role</DialogTitle>
          </DialogHeader>
          <form @submit.prevent="handleRoleUpdate">
            <p class="text-[var(--app-muted)] mb-4">
              Change the role for {{ roleForm.memberName }}.
            </p>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <label for="update-role">Role</label>
                <Select
                  id="update-role"
                  v-model="roleForm.role"
                  :options="memberRoleOptions"
                  option-label="label"
                  option-value="value"
                />
                <RolePermissionMatrix
                  class="mt-2"
                  scope="project"
                  :highlight="roleForm.role"
                  hide-descriptions
                />
              </div>
              <Alert
                v-if="projectsStore.error"
                variant="destructive"
              >
                {{ projectsStore.error }}
              </Alert>
            </div>
            <div class="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="secondary"
                @click="showRoleDialog = false"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                :loading="projectsStore.loading"
              >
                {{ projectsStore.loading ? 'Updating...' : 'Update role' }}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </template>
  </div>
</template>
