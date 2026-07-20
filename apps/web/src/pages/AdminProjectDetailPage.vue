<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageSkeleton from '~/components/PageSkeleton.vue'
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
  if (role === 'owner') return 'danger'
  if (role === 'admin') return 'warn'
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
      <Message severity="error">
        {{ projectsStore.error }}
      </Message>
      <Button
        label="&larr; All projects"
        outlined
        @click="router.push({ name: 'settings-admin-projects' })"
      />
    </div>

    <template v-else-if="projectsStore.currentProject">
      <div class="flex items-center justify-between">
        <div>
          <Button
            label="&larr; All projects"
            text
            size="small"
            @click="router.push({ name: 'settings-admin-projects' })"
          />
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
        </TabList>

        <TabPanels>
          <!-- Details tab -->
          <TabPanel value="details">
            <Card class="mt-4">
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
              </template>
            </Card>
          </TabPanel>

          <!-- Members tab -->
          <TabPanel value="members">
            <Card class="mt-4">
              <template #content>
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
                      <Tag
                        :value="data.role"
                        :severity="roleSeverity(data.role)"
                      />
                    </template>
                  </Column>
                  <Column header="Joined">
                    <template #body="{ data }">
                      <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.createdAt) }}</span>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>
</template>
