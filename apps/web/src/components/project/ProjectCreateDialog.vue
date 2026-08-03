<script setup lang="ts">
import type { Project } from '@template-monorepo-ts/shared'
import { ref } from 'vue'
import { Alert } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { useNotify } from '~/composables/useNotify'
import { useProjectsStore } from '~/stores/projects'

/**
 * Create a project in the active organization.
 *
 * The server reads the target organization from the session — `POST /projects`
 * has no `organizationId` in its body — so this is only ever correct for the
 * org currently selected in the switcher. Callers that show it from somewhere
 * org-scoped have to check that first; there is nothing this dialog can do
 * about a mismatch except create the project in the wrong place.
 */
const emit = defineEmits<{ created: [project: Project] }>()

const open = defineModel<boolean>('open', { default: false })

const projectsStore = useProjectsStore()
const notify = useNotify()

const form = ref({ name: '', description: '' })

async function handleCreate() {
  const project = await projectsStore.createProject({
    name: form.value.name,
    description: form.value.description || null,
  })
  if (!project) return

  notify.success('Project created', form.value.name)
  form.value = { name: '', description: '' }
  open.value = false
  emit('created', project)
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Create project</DialogTitle>
      </DialogHeader>
      <form @submit.prevent="handleCreate">
        <p class="text-[var(--app-muted)] mb-4">
          Add a new project to your workspace.
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="create-name">Name</label>
            <Input
              id="create-name"
              v-model="form.name"
              placeholder="My project"
              required
              minlength="3"
              maxlength="100"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="create-description">Description</label>
            <Input
              id="create-description"
              v-model="form.description"
              placeholder="Optional description"
              maxlength="500"
              class="w-full"
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
            @click="open = false"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            :loading="projectsStore.loading"
          >
            {{ projectsStore.loading ? 'Creating...' : 'Create' }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
