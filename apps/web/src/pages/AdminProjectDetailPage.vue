<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageSkeleton from '~/components/PageSkeleton.vue'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Column, DataTable } from '~/components/ui/data-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useOrgLookup } from '~/composables/useOrgLookup'
import { useProjectsStore } from '~/stores/projects'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const orgLookup = useOrgLookup()

const projectId = route.params.id as string

onMounted(async () => {
  await projectsStore.fetchProject(projectId)
  await projectsStore.fetchMembers(projectId)
  if (projectsStore.currentProject?.organizationId) {
    await orgLookup.resolveOrgs([projectsStore.currentProject.organizationId])
  }
})

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
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
        @click="router.push({ name: 'settings-admin-projects' })"
      >
        &larr; All projects
      </Button>
    </div>

    <template v-else-if="projectsStore.currentProject">
      <div class="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            @click="router.push({ name: 'settings-admin-projects' })"
          >
            &larr; All projects
          </Button>
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
            Members ({{ projectsStore.members.length }})
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
                    {{ projectsStore.currentProject.id }}
                  </p>
                </div>
                <div>
                  <p class="text-sm text-[var(--app-muted)]">
                    Name
                  </p>
                  <p class="font-medium text-[var(--app-fg)]">
                    {{ projectsStore.currentProject.name }}
                  </p>
                </div>
                <div>
                  <p class="text-sm text-[var(--app-muted)]">
                    Owner
                  </p>
                  <div>
                    <RouterLink
                      v-if="projectsStore.currentProject.owner"
                      :to="{ name: 'settings-admin-user-detail', params: { id: projectsStore.currentProject.ownerId } }"
                      class="font-medium text-[var(--app-link)] hover:underline"
                    >
                      {{ projectsStore.currentProject.owner.name }}
                    </RouterLink>
                    <p class="font-mono text-xs text-[var(--app-muted)]">
                      {{ projectsStore.currentProject.ownerId }}
                    </p>
                  </div>
                </div>
                <div>
                  <p class="text-sm text-[var(--app-muted)]">
                    Organization
                  </p>
                  <div v-if="projectsStore.currentProject.organizationId">
                    <RouterLink
                      :to="{ name: 'settings-admin-organization-detail', params: { id: projectsStore.currentProject.organizationId } }"
                      class="font-medium text-[var(--app-link)] hover:underline"
                    >
                      {{ orgLookup.getOrgName(projectsStore.currentProject.organizationId) }}
                    </RouterLink>
                    <p class="font-mono text-xs text-[var(--app-muted)]">
                      {{ projectsStore.currentProject.organizationId }}
                    </p>
                  </div>
                  <p
                    v-else
                    class="font-medium text-[var(--app-fg)]"
                  >
                    —
                  </p>
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
          <Card class="mt-4">
            <CardContent class="p-6">
              <DataTable
                :value="projectsStore.members"
                striped-rows
              >
                <template #empty>
                  No members.
                </template>
                <Column
                  field="user.name"
                  header="Name"
                >
                  <template #body="{ data }">
                    <div class="flex flex-col">
                      <RouterLink
                        :to="{ name: 'settings-admin-user-detail', params: { id: data.userId } }"
                        class="font-medium text-[var(--app-link)] hover:underline"
                      >
                        {{ data.user.name }}
                      </RouterLink>
                      <span class="text-xs text-[var(--app-muted)] font-mono">{{ data.userId }}</span>
                    </div>
                  </template>
                </Column>
                <Column
                  field="user.email"
                  header="Email"
                >
                  <template #body="{ data }">
                    <a
                      :href="`mailto:${data.user.email}`"
                      class="text-[var(--app-link)] hover:underline"
                    >{{ data.user.email }}</a>
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
                    <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.createdAt) }}</span>
                  </template>
                </Column>
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </template>
  </div>
</template>
