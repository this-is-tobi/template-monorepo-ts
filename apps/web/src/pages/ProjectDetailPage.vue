<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const showAddMemberDialog = ref(false)
const showRoleDialog = ref(false)
const editForm = ref({ name: '', description: '' })
const addMemberForm = ref({ userId: '', role: 'member' })
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
})

function openEdit() {
  if (!projectsStore.currentProject) return
  editForm.value = {
    name: projectsStore.currentProject.name,
    description: projectsStore.currentProject.description ?? '',
  }
  showEditDialog.value = true
}

async function handleEdit() {
  const result = await projectsStore.updateProject(projectId, {
    name: editForm.value.name,
    description: editForm.value.description || null,
  })
  if (result) {
    showEditDialog.value = false
  }
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
    userId: addMemberForm.value.userId,
    role: addMemberForm.value.role as 'admin' | 'member' | 'viewer',
  })
  if (ok) {
    addMemberForm.value = { userId: '', role: 'member' }
    showAddMemberDialog.value = false
  }
}

function openRoleDialog(memberId: string, memberName: string, currentRole: string) {
  roleForm.value = { memberId, memberName, role: currentRole }
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
        <div
          v-if="isProjectOwner"
          class="flex gap-2"
        >
          <Button
            label="Edit"
            outlined
            @click="openEdit"
          />
          <Button
            label="Delete"
            severity="danger"
            @click="showDeleteDialog = true"
          />
        </div>
      </div>

      <Card>
        <template #title>
          Details
        </template>
        <template #subtitle>
          Project information
        </template>
        <template #content>
          <div class="flex flex-col gap-3">
            <div class="grid grid-cols-2 gap-2 text-sm">
              <span class="text-[var(--app-muted)]">ID</span>
              <span class="font-mono text-xs">{{ projectsStore.currentProject.id }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <span class="text-[var(--app-muted)]">Owner</span>
              <span class="font-mono text-xs">{{ projectsStore.currentProject.ownerId }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <span class="text-[var(--app-muted)]">Created</span>
              <span>{{ formatDate(projectsStore.currentProject.createdAt) }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <span class="text-[var(--app-muted)]">Updated</span>
              <span>{{ formatDate(projectsStore.currentProject.updatedAt) }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Members -->
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
              header="User ID"
            >
              <template #body="{ data }">
                <span class="font-medium text-[var(--app-fg)]">{{ data.userId }}</span>
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
                    @click="openRoleDialog(data.id, data.userId, data.role)"
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

      <!-- Edit dialog -->
      <Dialog
        v-model:visible="showEditDialog"
        modal
        header="Edit project"
        :style="{ width: '28rem' }"
      >
        <form @submit.prevent="handleEdit">
          <p class="text-[var(--app-muted)] mb-4">
            Update your project details.
          </p>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label for="edit-name">Name</label>
              <InputText
                id="edit-name"
                v-model="editForm.name"
                required
                minlength="3"
                maxlength="100"
                fluid
              />
            </div>
            <div class="flex flex-col gap-2">
              <label for="edit-description">Description</label>
              <InputText
                id="edit-description"
                v-model="editForm.description"
                maxlength="500"
                fluid
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
              @click="showEditDialog = false"
            />
            <Button
              type="submit"
              :label="projectsStore.loading ? 'Saving...' : 'Save changes'"
              :loading="projectsStore.loading"
            />
          </div>
        </form>
      </Dialog>

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
            Add a collaborator to this project by their user ID.
          </p>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label for="member-userId">User ID</label>
              <InputText
                id="member-userId"
                v-model="addMemberForm.userId"
                required
                placeholder="Enter user ID"
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
