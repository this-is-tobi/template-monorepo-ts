<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import { onMounted, ref } from 'vue'
import { apiClient } from '~/lib/api'
import { useAuthStore } from '~/stores/auth'
import { useOrganizationsStore } from '~/stores/organizations'
import { useProjectsStore } from '~/stores/projects'

const auth = useAuthStore()
const projectsStore = useProjectsStore()
const organizationsStore = useOrganizationsStore()
const apiVersion = ref('')

onMounted(async () => {
  await projectsStore.fetchProjects()
  await organizationsStore.fetchUserInvitations()
  try {
    const { data } = await apiClient.system.getVersion()
    apiVersion.value = data.version ?? ''
  } catch {
    // API may not be reachable
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
        Dashboard
      </h1>
      <p class="text-[var(--app-muted)]">
        Welcome back, {{ auth.user?.name }}.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <Card v-if="organizationsStore.userInvitations.length > 0">
        <template #subtitle>
          Pending invitations
        </template>
        <template #title>
          <span class="text-2xl">{{ organizationsStore.userInvitations.length }}</span>
        </template>
        <template #content>
          <RouterLink to="/organizations">
            <Button
              label="View invitations"
              outlined
              size="small"
            />
          </RouterLink>
        </template>
      </Card>

      <Card>
        <template #subtitle>
          Projects
        </template>
        <template #title>
          <span class="text-2xl">{{ projectsStore.projects.length }}</span>
        </template>
        <template #content>
          <RouterLink to="/projects">
            <Button
              label="View all projects"
              outlined
              size="small"
            />
          </RouterLink>
        </template>
      </Card>

      <Card>
        <template #subtitle>
          User
        </template>
        <template #title>
          <span class="text-2xl truncate">{{ auth.user?.email }}</span>
        </template>
        <template #content>
          <p class="text-sm text-[var(--app-muted)]">
            ID: {{ auth.user?.id }}
          </p>
        </template>
      </Card>

      <Card v-if="apiVersion">
        <template #subtitle>
          API
        </template>
        <template #title>
          <span class="text-2xl">{{ apiVersion }}</span>
        </template>
        <template #content>
          <p class="text-sm text-[var(--app-muted)]">
            Current API version
          </p>
        </template>
      </Card>
    </div>
  </div>
</template>
