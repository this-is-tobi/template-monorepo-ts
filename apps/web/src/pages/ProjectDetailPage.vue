<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const showDeleteDialog = ref(false)
const showAddMemberDialog = ref(false)
const showRoleDialog = ref(false)
const editForm = ref({ name: '', description: '' })
const addMemberForm = ref({ email: '', role: 'member' })
const roleForm = ref({ memberId: '', memberName: '', role: '' })

const projectId = route.params.id as string

const memberRoleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Member', value: 'member' },
  { label: 'Viewer', value: 'viewer' },
]

const isProjectOwner = computed(() => {
  return projectsStore.currentProject?.ownerId === authStore.user?.id
})

onMounted(async () => {
  await projectsStore.fetchProject(projectId)
  await projectsStore.fetchMembers(projectId)
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
  await projectsStore.updateProject(projectId, {
    name: editForm.value.name,
    description: editForm.value.description || null,
  })
}

async function handleDelete() {
  const ok = await projectsStore.deleteProject(projectId)
  if (ok) {
    router.push({ name: 'projects' })
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

async function handleAddMember() {
  const ok = await projectsStore.addMember(projectId, {
    email: addMemberForm.value.email,
    role: addMemberForm.value.role as 'admin' | 'member' | 'viewer',
  })
  if (ok) {
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
  })
  if (ok) showRoleDialog.value = false
}

async function handleRemoveMember(memberId: string) {
  await projectsStore.removeMember(projectId, memberId)
}

function roleSeverity(role: string) {
  if (role === 'owner') return 'danger'
  if (role === 'admin') return 'warn'
  return 'info'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="projectsStore.loading && !projectsStore.currentProject">
      <p class="text-[var(--app-muted)]">
        Loading...
      </p>
    </div>

    <div
      v-else-if="projectsStore.error && !projectsStore.currentProject"
      class="flex flex-col gap-4"
    >
      <Message severity="error">
        {{ projectsStore.error }}
      </Message>
      <Button
        label="Back to projects"
        outlined
        @click="router.push({ name: 'projects' })"
      />
    </div>

    <template v-else-if="projectsStore.currentProject">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <Button
              label="&larr; Projects"
              text
              size="small"
              @click="router.push({ name: 'projects' })"
            />
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

      <Tabs value="details">
        <TabList>
          <Tab value="details">
            Details
          </Tab>
          <Tab value="members">
            Members ({{ projectsStore.members.length }})
          </Tab>
          <Tab
            v-if="isProjectOwner"
            value="settings"
          >
            Settings
          </Tab>
        </TabList>

        <TabPanels>
          <!-- Details tab -->
          <TabPanel value="details">
            <Card>
              <template #title>
                Project information
              </template>
              <template #content>
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
              </template>
            </Card>
          </TabPanel>

          <!-- Members tab -->
          <TabPanel value="members">
            <Card>
              <template #title>
                <div class="flex items-center justify-between">
                  <span>Members</span>
                  <Button
                    v-if="isProjectOwner"
                    label="Add member"
                    outlined
                    size="small"
                    @click="showAddMemberDialog = true"
                  />
                </div>
              </template>
              <template #content>
                <DataTable
                  :value="projectsStore.members"
                  striped-rows
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
                      <Tag
                        :value="data.role"
                        :severity="roleSeverity(data.role)"
                      />
                    </template>
                  </Column>
                  <Column header="Joined">
                    <template #body="{ data }">
                      <span class="text-[var(--app-muted)]">{{ formatDate(data.createdAt) }}</span>
                    </template>
                  </Column>
                  <Column
                    v-if="isProjectOwner"
                    header="Actions"
                    style="width: 12rem"
                  >
                    <template #body="{ data }">
                      <div
                        v-if="data.role !== 'owner'"
                        class="flex gap-2"
                      >
                        <Button
                          label="Role"
                          text
                          size="small"
                          @click="openRoleDialog(data.id, data.user?.name ?? data.userId, data.role)"
                        />
                        <Button
                          label="Remove"
                          text
                          severity="danger"
                          size="small"
                          @click="handleRemoveMember(data.id)"
                        />
                      </div>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>
          </TabPanel>
          <!-- Settings tab -->
          <TabPanel
            v-if="isProjectOwner"
            value="settings"
          >
            <Card class="mt-4">
              <template #title>
                General
              </template>
              <template #content>
                <form
                  class="flex flex-col gap-4 max-w-md"
                  @submit.prevent="handleEdit"
                >
                  <div class="flex flex-col gap-1">
                    <label
                      class="text-sm text-[var(--app-fg)]"
                      for="edit-name"
                    >Name</label>
                    <InputText
                      id="edit-name"
                      v-model="editForm.name"
                      required
                      minlength="3"
                      maxlength="100"
                      fluid
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
                      fluid
                    />
                  </div>
                  <Message
                    v-if="projectsStore.error"
                    severity="error"
                  >
                    {{ projectsStore.error }}
                  </Message>
                  <div class="flex justify-end">
                    <Button
                      type="submit"
                      :label="projectsStore.loading ? 'Saving...' : 'Save changes'"
                      :loading="projectsStore.loading"
                    />
                  </div>
                </form>
              </template>
            </Card>

            <Card class="mt-4">
              <template #title>
                <span class="text-red-600">Danger zone</span>
              </template>
              <template #content>
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
        modal
        header="Delete project"
        :style="{ width: '28rem' }"
      >
        <p class="text-[var(--app-muted)]">
          Are you sure you want to delete "{{ projectsStore.currentProject.name }}"? This action cannot be undone.
        </p>
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
            :loading="projectsStore.loading"
            @click="handleDelete"
          />
        </div>
      </Dialog>

      <!-- Add member dialog -->
      <Dialog
        v-model:visible="showAddMemberDialog"
        modal
        header="Add member"
        :style="{ width: '28rem' }"
      >
        <form @submit.prevent="handleAddMember">
          <p class="text-[var(--app-muted)] mb-4">
            Add a collaborator to this project by their email address.
          </p>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label for="member-email">Email</label>
              <InputText
                id="member-email"
                v-model="addMemberForm.email"
                type="email"
                required
                placeholder="Enter email address"
                fluid
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
            </div>
            <Message
              v-if="projectsStore.error"
              severity="error"
            >
              {{ projectsStore.error }}
            </Message>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              label="Cancel"
              severity="secondary"
              @click="showAddMemberDialog = false"
            />
            <Button
              type="submit"
              :label="projectsStore.loading ? 'Adding...' : 'Add member'"
              :loading="projectsStore.loading"
            />
          </div>
        </form>
      </Dialog>

      <!-- Update role dialog -->
      <Dialog
        v-model:visible="showRoleDialog"
        modal
        header="Update member role"
        :style="{ width: '28rem' }"
      >
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
            </div>
            <Message
              v-if="projectsStore.error"
              severity="error"
            >
              {{ projectsStore.error }}
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
              :label="projectsStore.loading ? 'Updating...' : 'Update role'"
              :loading="projectsStore.loading"
            />
          </div>
        </form>
      </Dialog>
    </template>
  </div>
</template>
