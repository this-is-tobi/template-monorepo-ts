<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProjectsTable from '~/components/ProjectsTable.vue'
import { useAdminUsersStore } from '~/stores/admin-users'

const route = useRoute()
const router = useRouter()
const usersStore = useAdminUsersStore()

const userId = route.params.id as string

const roleOptions = [
  { label: 'User', value: 'user' },
  { label: 'Admin', value: 'admin' },
]

const showRoleDialog = ref(false)
const showBanDialog = ref(false)
const roleForm = ref<{ role: 'admin' | 'user' }>({ role: 'user' })
const banForm = ref({ reason: '' })

onMounted(() => {
  usersStore.fetchUserById(userId)
})

function openRoleDialog() {
  roleForm.value = { role: (usersStore.currentUser?.role ?? 'user') as 'admin' | 'user' }
  showRoleDialog.value = true
}

async function handleRoleChange() {
  const ok = await usersStore.setRole(userId, roleForm.value.role)
  if (ok) {
    showRoleDialog.value = false
    usersStore.fetchUserById(userId)
  }
}

function openBanDialog() {
  banForm.value = { reason: '' }
  showBanDialog.value = true
}

async function handleBan() {
  const ok = await usersStore.banUser(userId, banForm.value.reason || undefined)
  if (ok) {
    showBanDialog.value = false
    usersStore.fetchUserById(userId)
  }
}

async function handleUnban() {
  await usersStore.unbanUser(userId)
  usersStore.fetchUserById(userId)
}

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

function roleSeverity(role: string) {
  if (role === 'owner') return 'danger'
  if (role === 'admin') return 'warn'
  return 'info'
}

function permissionCount(permissions: string | null | undefined): number {
  if (!permissions) return 0
  try {
    const parsed = JSON.parse(permissions) as Record<string, string[]>
    return Object.values(parsed).reduce((sum, actions) => sum + actions.length, 0)
  } catch {
    return 0
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="usersStore.loading && !usersStore.currentUser">
      <p class="text-[var(--app-muted)]">
        Loading...
      </p>
    </div>

    <div
      v-else-if="usersStore.error && !usersStore.currentUser"
      class="flex flex-col gap-4"
    >
      <Message severity="error">
        {{ usersStore.error }}
      </Message>
      <Button
        label="&larr; All users"
        outlined
        @click="router.push({ name: 'settings-admin-users' })"
      />
    </div>

    <template v-else-if="usersStore.currentUser">
      <div class="flex items-center justify-between">
        <div>
          <Button
            label="&larr; All users"
            text
            size="small"
            @click="router.push({ name: 'settings-admin-users' })"
          />
          <h1 class="text-3xl font-bold tracking-tight mt-2 text-[var(--app-fg)]">
            {{ usersStore.currentUser.name }}
          </h1>
          <p class="text-[var(--app-muted)]">
            {{ usersStore.currentUser.email }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            label="Change role"
            outlined
            @click="openRoleDialog"
          />
          <Button
            v-if="!usersStore.currentUser.banned"
            label="Ban"
            severity="danger"
            outlined
            @click="openBanDialog"
          />
          <Button
            v-else
            label="Unban"
            severity="success"
            outlined
            @click="handleUnban"
          />
        </div>
      </div>

      <Tabs value="details">
        <TabList>
          <Tab value="details">
            Details
          </Tab>
          <Tab value="organizations">
            Organizations ({{ usersStore.currentUser.memberships.length }})
          </Tab>
          <Tab value="projects">
            Projects ({{ usersStore.currentUser.projects.length }})
          </Tab>
          <Tab value="api-keys">
            API keys ({{ usersStore.currentUser.apiKeys.length }})
          </Tab>
        </TabList>

        <TabPanels>
          <!-- Details tab -->
          <TabPanel value="details">
            <Card>
              <template #title>
                User information
              </template>
              <template #content>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      ID
                    </p>
                    <p class="font-mono text-xs">
                      {{ usersStore.currentUser.id }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Email
                    </p>
                    <a
                      :href="`mailto:${usersStore.currentUser.email}`"
                      class="text-[var(--app-link)] hover:underline"
                    >{{ usersStore.currentUser.email }}</a>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Role
                    </p>
                    <Tag
                      :value="usersStore.currentUser.role ?? 'user'"
                      :severity="roleSeverity(usersStore.currentUser.role ?? 'user')"
                    />
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Status
                    </p>
                    <Tag
                      v-if="usersStore.currentUser.banned"
                      value="Banned"
                      severity="danger"
                    />
                    <Tag
                      v-else
                      value="Active"
                      severity="success"
                    />
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Email verified
                    </p>
                    <Tag
                      :value="usersStore.currentUser.emailVerified ? 'Yes' : 'No'"
                      :severity="usersStore.currentUser.emailVerified ? 'success' : 'warn'"
                    />
                  </div>
                  <div>
                    <p class="text-sm text-[var(--app-muted)]">
                      Created
                    </p>
                    <p class="font-medium text-[var(--app-fg)]">
                      {{ formatDate(usersStore.currentUser.createdAt) }}
                    </p>
                  </div>
                </div>
                <div
                  v-if="usersStore.currentUser.banned && usersStore.currentUser.banReason"
                  class="mt-4"
                >
                  <Message severity="warn">
                    Ban reason: {{ usersStore.currentUser.banReason }}
                  </Message>
                </div>
              </template>
            </Card>
          </TabPanel>

          <!-- Organizations tab -->
          <TabPanel value="organizations">
            <Card>
              <template #content>
                <DataTable
                  :value="usersStore.currentUser.memberships"
                  striped-rows
                >
                  <template #empty>
                    Not a member of any organization.
                  </template>
                  <Column
                    field="organization.name"
                    header="Organization"
                  >
                    <template #body="{ data }">
                      <router-link
                        :to="{ name: 'settings-admin-organization-detail', params: { id: data.organization.id } }"
                        class="font-medium text-[var(--app-link)] hover:underline"
                      >
                        {{ data.organization.name }}
                      </router-link>
                    </template>
                  </Column>
                  <Column
                    field="organization.slug"
                    header="Slug"
                  >
                    <template #body="{ data }">
                      <span class="text-[var(--app-muted)] font-mono text-sm">{{ data.organization.slug }}</span>
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

          <!-- Projects tab -->
          <TabPanel value="projects">
            <Card>
              <template #content>
                <ProjectsTable
                  :projects="usersStore.currentUser.projects"
                  empty-message="No projects owned."
                />
              </template>
            </Card>
          </TabPanel>

          <!-- API Keys tab -->
          <TabPanel value="api-keys">
            <Card>
              <template #content>
                <DataTable
                  :value="usersStore.currentUser.apiKeys"
                  striped-rows
                >
                  <template #empty>
                    No API keys.
                  </template>
                  <Column
                    field="name"
                    header="Name"
                  >
                    <template #body="{ data }">
                      <router-link
                        :to="{ name: 'settings-admin-api-key-detail', params: { id: data.id } }"
                        class="font-medium text-[var(--app-link)] hover:underline"
                      >
                        {{ data.name ?? '—' }}
                      </router-link>
                    </template>
                  </Column>
                  <Column header="Key prefix">
                    <template #body="{ data }">
                      <code class="text-sm text-[var(--app-muted)]">{{ data.start ?? '••••' }}</code>
                    </template>
                  </Column>
                  <Column header="Permissions">
                    <template #body="{ data }">
                      <Tag
                        v-if="permissionCount(data.permissions) > 0"
                        :value="`${permissionCount(data.permissions)} permission${permissionCount(data.permissions) !== 1 ? 's' : ''}`"
                        severity="info"
                      />
                      <span
                        v-else
                        class="text-[var(--app-muted)] text-sm"
                      >All (unrestricted)</span>
                    </template>
                  </Column>
                  <Column header="Status">
                    <template #body="{ data }">
                      <Tag
                        :value="data.enabled ? 'Active' : 'Disabled'"
                        :severity="data.enabled ? 'success' : 'danger'"
                      />
                    </template>
                  </Column>
                  <Column header="Expires">
                    <template #body="{ data }">
                      <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.expiresAt) }}</span>
                    </template>
                  </Column>
                </DataTable>
              </template>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>

    <!-- Role dialog -->
    <Dialog
      v-model:visible="showRoleDialog"
      header="Change role"
      modal
      class="w-full max-w-md"
    >
      <div class="flex flex-col gap-4">
        <Select
          v-model="roleForm.role"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
        <Button
          label="Save"
          @click="handleRoleChange"
        />
      </div>
    </Dialog>

    <!-- Ban dialog -->
    <Dialog
      v-model:visible="showBanDialog"
      header="Ban user"
      modal
      class="w-full max-w-md"
    >
      <div class="flex flex-col gap-4">
        <InputText
          v-model="banForm.reason"
          placeholder="Reason (optional)"
          class="w-full"
        />
        <Button
          label="Ban"
          severity="danger"
          @click="handleBan"
        />
      </div>
    </Dialog>
  </div>
</template>
