<script setup lang="ts">
import { watch } from 'vue'
import RelativeTime from '~/components/RelativeTime.vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useActiveOrg } from '~/composables/useActiveOrg'
import { useProjectsStore } from '~/stores/projects'

const projectsStore = useProjectsStore()
const { activeOrgId } = useActiveOrg()

watch(activeOrgId, (orgId) => {
  projectsStore.fetchProjects({ limit: 5, ...(orgId ? { organizationId: orgId } : {}) })
}, { immediate: true })
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0">
      <CardTitle class="text-base">
        Recent projects
      </CardTitle>
      <RouterLink
        v-if="projectsStore.projects.length > 0"
        class="text-sm text-[var(--primary)] hover:underline"
        to="/projects"
      >
        View all
      </RouterLink>
    </CardHeader>
    <CardContent>
      <p v-if="projectsStore.projects.length === 0" class="text-sm text-[var(--app-muted)]">
        No projects yet.
        <RouterLink class="text-[var(--primary)] hover:underline" to="/projects">
          Create one →
        </RouterLink>
      </p>
      <ul v-else class="flex flex-col divide-y divide-[var(--app-border)]">
        <li
          v-for="project in projectsStore.projects"
          :key="project.id"
          class="flex items-center justify-between gap-4 py-2"
        >
          <div class="min-w-0">
            <RouterLink
              :to="`/projects/${project.id}`"
              class="font-medium text-[var(--app-fg)] hover:text-[var(--primary)]"
            >
              {{ project.name }}
            </RouterLink>
            <p v-if="project.description" class="line-clamp-1 text-xs text-[var(--app-muted)]">
              {{ project.description }}
            </p>
          </div>
          <RelativeTime
            :value="project.createdAt"
            class="shrink-0 text-xs text-[var(--app-muted)]"
          />
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
