<script setup lang="ts">
import { parseOrgMetadata } from '@template-monorepo-ts/shared'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrgMembersTable from '~/components/OrgMembersTable.vue'
import { authClient } from '~/lib/auth'
import { useAdminOrganizationsStore } from '~/stores/admin-organizations'

const route = useRoute()
const router = useRouter()
const adminOrgsStore = useAdminOrganizationsStore()

const organizationId = route.params.id as string

const maxProjects = ref<number | null>(null)
const savingSettings = ref(false)
const saveError = ref<string | null>(null)

onMounted(() => {
  adminOrgsStore.fetchOrganizationById(organizationId)
})

// Personal orgs redirect to the owner's user detail page
watch(() => adminOrgsStore.currentOrganization, (org) => {
  if (!org) return
  const meta = parseOrgMetadata(org.metadata)
  if (meta.personal) {
    const owner = org.members.find(m => m.role === 'owner')
    if (owner) {
      router.replace({ name: 'settings-admin-user-detail', params: { id: owner.userId } })
      return
    }
  }
  maxProjects.value = meta.maxProjects ?? null
})

async function handleSaveSettings() {
  const org = adminOrgsStore.currentOrganization
  if (!org) return
  savingSettings.value = true
  saveError.value = null
  const meta = parseOrgMetadata(org.metadata) as Record<string, unknown>
  meta.maxProjects = maxProjects.value
  const { error } = await authClient.organization.update({
    organizationId,
    data: { metadata: meta },
  })
  if (error) {
    saveError.value = error.message ?? 'Failed to save settings'
  } else {
    await adminOrgsStore.fetchOrganizationById(organizationId)
  }
  savingSettings.value = false
}

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="adminOrgsStore.loading && !adminOrgsStore.currentOrganization">
      <p class="text-[var(--app-muted)]">
        Loading...
      </p>
    </div>

    <div
      v-else-if="adminOrgsStore.error && !adminOrgsStore.currentOrganization"
      class="flex flex-col gap-4"
    >
      <Message severity="error">
        {{ adminOrgsStore.error }}
      </Message>
      <Button
        label="&larr; All organizations"
        outlined
        @click="router.push({ name: 'settings-admin-organizations' })"
      />
    </div>

    <template v-else-if="adminOrgsStore.currentOrganization">
      <div class="flex items-center justify-between">
        <div>
          <Button
            label="&larr; All organizations"
            text
            size="small"
            @click="router.push({ name: 'settings-admin-organizations' })"
          />
          <h1 class="text-3xl font-bold tracking-tight mt-2 text-[var(--app-fg)]">
            {{ adminOrgsStore.currentOrganization.name }}
          </h1>
          <p class="text-[var(--app-muted)]">
            {{ adminOrgsStore.currentOrganization.slug }}
          </p>
        </div>
      </div>

      <Tabs value="details">
        <TabList>
          <Tab value="details">
            Details
          </Tab>
          <Tab value="members">
            Members ({{ adminOrgsStore.currentOrganization.members.length }})
          </Tab>
          <Tab value="settings">
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
                      ID
                    </p>
                    <p class="font-mono text-xs">
                      {{ adminOrgsStore.currentOrganization.id }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Name
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ adminOrgsStore.currentOrganization.name }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Slug
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ adminOrgsStore.currentOrganization.slug }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Created
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ formatDate(adminOrgsStore.currentOrganization.createdAt) }}
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
                <OrgMembersTable
                  :members="adminOrgsStore.currentOrganization.members"
                  admin-links
                />
              </template>
            </Card>
          </TabPanel>

          <!-- Settings tab -->
          <TabPanel value="settings">
            <Card class="mt-4">
              <template #title>
                Quotas
              </template>
              <template #content>
                <form
                  class="flex flex-col gap-4 max-w-md"
                  @submit.prevent="handleSaveSettings"
                >
                  <div class="flex flex-col gap-1">
                    <label
                      class="text-sm text-[var(--app-fg)]"
                      for="org-max-projects"
                    >Max projects</label>
                    <span class="text-xs text-[var(--app-muted)]">Maximum number of projects for this organization. Leave empty for unlimited.</span>
                    <InputNumber
                      id="org-max-projects"
                      v-model="maxProjects"
                      :min="0"
                      :allow-empty="true"
                      fluid
                    />
                  </div>
                  <Message
                    v-if="saveError"
                    severity="error"
                  >
                    {{ saveError }}
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
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>
</template>
