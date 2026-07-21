<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageSkeleton from '~/components/PageSkeleton.vue'
import ProjectsTable from '~/components/ProjectsTable.vue'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Column, DataTable } from '~/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
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
  if (role === 'owner') return 'destructive'
  if (role === 'admin') return 'warning'
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
      <PageSkeleton />
    </div>

    <div
      v-else-if="usersStore.error && !usersStore.currentUser"
      class="flex flex-col gap-4"
    >
      <Alert variant="destructive">
        {{ usersStore.error }}
      </Alert>
      <Button
        variant="outline"
        @click="router.push({ name: 'settings-admin-users' })"
      >
        &larr; All users
      </Button>
    </div>

    <template v-else-if="usersStore.currentUser">
      <div class="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            @click="router.push({ name: 'settings-admin-users' })"
          >
            &larr; All users
          </Button>
          <h1 class="text-3xl font-bold tracking-tight mt-2 text-[var(--app-fg)]">
            {{ usersStore.currentUser.name }}
          </h1>
          <p class="text-[var(--app-muted)]">
            {{ usersStore.currentUser.email }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            variant="outline"
            @click="openRoleDialog"
          >
            Change role
          </Button>
          <Button
            v-if="!usersStore.currentUser.banned"
            variant="outline"
            class="text-destructive border-destructive/40 hover:bg-destructive/10"
            @click="openBanDialog"
          >
            Ban
          </Button>
          <Button
            v-else
            variant="outline"
            @click="handleUnban"
          >
            Unban
          </Button>
        </div>
      </div>

      <Tabs default-value="details">
        <TabsList>
          <TabsTrigger value="details">
            Details
          </TabsTrigger>
          <TabsTrigger value="organizations">
            Organizations ({{ usersStore.currentUser.memberships.length }})
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projects ({{ usersStore.currentUser.projects.length }})
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            API keys ({{ usersStore.currentUser.apiKeys.length }})
          </TabsTrigger>
        </TabsList>

        <!-- Details tab -->
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>
                User information
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  <Badge :variant="roleSeverity(usersStore.currentUser.role ?? 'user')">
                    {{ usersStore.currentUser.role ?? 'user' }}
                  </Badge>
                </div>
                <div>
                  <p class="text-sm text-[var(--app-muted)]">
                    Status
                  </p>
                  <Badge
                    v-if="usersStore.currentUser.banned"
                    variant="destructive"
                  >
                    Banned
                  </Badge>
                  <Badge
                    v-else
                    variant="success"
                  >
                    Active
                  </Badge>
                </div>
                <div>
                  <p class="text-sm text-[var(--app-muted)]">
                    Email verified
                  </p>
                  <Badge :variant="usersStore.currentUser.emailVerified ? 'success' : 'warning'">
                    {{ usersStore.currentUser.emailVerified ? 'Yes' : 'No' }}
                  </Badge>
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
                <Alert variant="warning">
                  Ban reason: {{ usersStore.currentUser.banReason }}
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Organizations tab -->
        <TabsContent value="organizations">
          <Card>
            <CardContent class="p-6">
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

        <!-- Projects tab -->
        <TabsContent value="projects">
          <Card>
            <CardContent class="p-6">
              <ProjectsTable
                :projects="usersStore.currentUser.projects"
                empty-message="No projects owned."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <!-- API Keys tab -->
        <TabsContent value="api-keys">
          <Card>
            <CardContent class="p-6">
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
                    <Badge
                      v-if="permissionCount(data.permissions) > 0"
                      variant="info"
                    >
                      {{ `${permissionCount(data.permissions)} permission${permissionCount(data.permissions) !== 1 ? 's' : ''}` }}
                    </Badge>
                    <span
                      v-else
                      class="text-[var(--app-muted)] text-sm"
                    >All (unrestricted)</span>
                  </template>
                </Column>
                <Column header="Status">
                  <template #body="{ data }">
                    <Badge :variant="data.enabled ? 'success' : 'destructive'">
                      {{ data.enabled ? 'Active' : 'Disabled' }}
                    </Badge>
                  </template>
                </Column>
                <Column header="Expires">
                  <template #body="{ data }">
                    <span class="text-[var(--app-muted)] text-sm">{{ formatDate(data.expiresAt) }}</span>
                  </template>
                </Column>
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </template>

    <!-- Role dialog -->
    <Dialog v-model:open="showRoleDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
        </DialogHeader>
        <div class="flex flex-col gap-4">
          <Select
            v-model="roleForm.role"
            :options="roleOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
          <Button
            @click="handleRoleChange"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Ban dialog -->
    <Dialog v-model:open="showBanDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Ban user</DialogTitle>
        </DialogHeader>
        <div class="flex flex-col gap-4">
          <Input
            v-model="banForm.reason"
            placeholder="Reason (optional)"
            class="w-full"
          />
          <Button
            variant="destructive"
            @click="handleBan"
          >
            Ban
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
