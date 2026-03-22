<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()

const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const editForm = ref({ name: '', description: '' })

const projectId = route.params.id as string

onMounted(() => {
  projectsStore.fetchProject(projectId)
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
        <div class="flex gap-2">
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
    </template>
  </div>
</template>
