<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useActiveOrg } from '~/composables/useActiveOrg'
import { useNotify } from '~/composables/useNotify'
import { apiClient } from '~/lib/api'
import { useApiKeysStore } from '~/stores/api-keys'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'
import { useOrganizationsStore } from '~/stores/organizations'
import { useProjectsStore } from '~/stores/projects'

const auth = useAuthStore()
const notify = useNotify()
const projectsStore = useProjectsStore()
const organizationsStore = useOrganizationsStore()
const apiKeysStore = useApiKeysStore()
const configStore = useConfigStore()
const { activeOrgId } = useActiveOrg()
const apiVersion = ref('')

/**
 * Projects are scoped to the active organization — the KPI count and the
 * "Recent projects" list reflect the org selected in the header switcher
 * (matching the /projects page and the per-org quota shown below).
 */
async function loadProjects() {
  const orgId = activeOrgId.value
  await projectsStore.fetchProjects({ limit: 5, ...(orgId ? { organizationId: orgId } : {}) })
}

onMounted(async () => {
  await Promise.all([
    organizationsStore.fetchOrganizations(),
    organizationsStore.fetchUserInvitations(),
    apiKeysStore.fetchApiKeys(),
  ])
  try {
    const { data } = await apiClient.system.getVersion()
    apiVersion.value = data.version ?? ''
  } catch {
    // ignore
  }
})

// Load on mount and refresh whenever the active organization changes.
watch(activeOrgId, loadProjects, { immediate: true })

async function acceptInvitation(id: string) {
  await organizationsStore.acceptInvitation(id)
  notify.success('Invitation accepted')
}

async function rejectInvitation(id: string) {
  await organizationsStore.rejectInvitation(id)
  notify.info('Invitation declined')
}

const activeApiKeys = computed(() => apiKeysStore.apiKeys.filter(k => k.enabled))
const expiringApiKeys = computed(() => {
  const soon = Date.now() + 7 * 24 * 60 * 60 * 1000
  return apiKeysStore.apiKeys.filter(k => k.enabled && k.expiresAt && new Date(k.expiresAt).getTime() < soon)
})

const projectQuotaMax = computed(() => configStore.config.maxProjectsPerOrg)
const orgQuotaMax = computed(() => configStore.config.maxOrganizationsPerUser)
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-[var(--app-fg)]">
        Dashboard
      </h1>
      <p class="text-[var(--app-muted)]">
        Welcome back, {{ auth.user?.name }}.
      </p>
    </div>

    <!-- Pending invitations -->
    <div v-if="organizationsStore.userInvitations.length > 0" class="flex flex-col gap-3">
      <h2 class="text-lg font-semibold text-[var(--app-fg)]">
        Pending invitations
      </h2>
      <div class="flex flex-col gap-2">
        <div
          v-for="invitation in organizationsStore.userInvitations"
          :key="invitation.id"
          class="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3"
        >
          <div>
            <p class="font-medium text-[var(--app-fg)]">
              {{ invitation.organizationName }}
            </p>
            <p class="text-sm text-[var(--app-muted)]">
              Invited as <span class="capitalize">{{ invitation.role }}</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button
              size="sm"
              @click="acceptInvitation(invitation.id)"
            >
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="rejectInvitation(invitation.id)"
            >
              Decline
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Projects -->
      <Card class="h-full card-hover">
        <CardContent class="p-6">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]">Projects</span>
            <div class="flex items-end gap-2">
              <span class="text-3xl font-bold text-[var(--app-fg)]">{{ projectsStore.total ?? 0 }}</span>
              <span v-if="projectQuotaMax !== null" class="mb-1 text-sm text-[var(--app-muted)]">/ {{ projectQuotaMax }}</span>
            </div>
            <RouterLink class="mt-2 text-sm text-[var(--primary)] hover:underline" to="/projects">
              View all projects →
            </RouterLink>
          </div>
        </CardContent>
      </Card>

      <!-- Organizations -->
      <Card class="h-full card-hover">
        <CardContent class="p-6">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]">Organizations</span>
            <div class="flex items-end gap-2">
              <span class="text-3xl font-bold text-[var(--app-fg)]">{{ organizationsStore.organizations.length }}</span>
              <span v-if="orgQuotaMax !== null" class="mb-1 text-sm text-[var(--app-muted)]">/ {{ orgQuotaMax }}</span>
            </div>
            <RouterLink class="mt-2 text-sm text-[var(--primary)] hover:underline" to="/organizations">
              View all →
            </RouterLink>
          </div>
        </CardContent>
      </Card>

      <!-- API keys -->
      <Card class="h-full card-hover">
        <CardContent class="p-6">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]">API Keys</span>
            <span class="text-3xl font-bold text-[var(--app-fg)]">{{ activeApiKeys.length }}</span>
            <p class="text-sm text-[var(--app-muted)]">
              {{ apiKeysStore.apiKeys.length }} total
            </p>
            <RouterLink class="mt-2 text-sm text-[var(--primary)] hover:underline" to="/api-keys">
              Manage →
            </RouterLink>
          </div>
        </CardContent>
      </Card>

      <!-- Account -->
      <Card class="h-full card-hover">
        <CardContent class="p-6">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]">Account</span>
            <span class="truncate text-lg font-semibold text-[var(--app-fg)]">{{ auth.user?.email }}</span>
            <div class="mt-1 flex items-center gap-2">
              <Badge :variant="auth.isAdmin ? 'warning' : 'secondary'">
                {{ auth.isAdmin ? 'Admin' : 'User' }}
              </Badge>
            </div>
            <RouterLink class="mt-2 text-sm text-[var(--primary)] hover:underline" to="/profile">
              Account settings →
            </RouterLink>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Recent projects + Organizations -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Recent projects -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Recent projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="projectsStore.projects.length === 0" class="text-sm text-[var(--app-muted)]">
            No projects yet.
            <RouterLink class="text-[var(--primary)] hover:underline" to="/projects">
              Create one →
            </RouterLink>
          </div>
          <ul v-else class="flex flex-col divide-y divide-[var(--app-border)]">
            <li
              v-for="project in projectsStore.projects"
              :key="project.id"
              class="flex items-center justify-between py-2"
            >
              <div>
                <RouterLink
                  :to="`/projects/${project.id}`"
                  class="font-medium text-[var(--app-fg)] hover:text-[var(--primary)]"
                >
                  {{ project.name }}
                </RouterLink>
                <p v-if="project.description" class="text-xs text-[var(--app-muted)] line-clamp-1">
                  {{ project.description }}
                </p>
              </div>
              <span class="text-xs text-[var(--app-muted)]">{{ new Date(project.createdAt).toLocaleDateString() }}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <!-- Organizations -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Your organizations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="organizationsStore.organizations.length === 0" class="text-sm text-[var(--app-muted)]">
            Not a member of any organization.
            <RouterLink class="text-[var(--primary)] hover:underline" to="/organizations">
              Create one →
            </RouterLink>
          </div>
          <ul v-else class="flex flex-col divide-y divide-[var(--app-border)]">
            <li
              v-for="org in organizationsStore.organizations"
              :key="org.id"
              class="flex items-center justify-between py-2"
            >
              <RouterLink
                :to="`/organizations/${org.id}`"
                class="font-medium text-[var(--app-fg)] hover:text-[var(--primary)]"
              >
                {{ org.name }}
              </RouterLink>
              <span class="font-mono text-xs text-[var(--app-muted)]">{{ org.slug }}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>

    <!-- Expiring API keys warning -->
    <div v-if="expiringApiKeys.length > 0">
      <Card>
        <CardHeader>
          <CardTitle class="text-base text-orange-500">
            ⚠ Keys expiring soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="flex flex-col gap-1">
            <li
              v-for="key in expiringApiKeys"
              :key="key.id"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-[var(--app-fg)]">{{ key.name ?? key.prefix ?? key.id }}</span>
              <span class="text-[var(--app-muted)]">Expires {{ new Date(key.expiresAt!).toLocaleDateString() }}</span>
            </li>
          </ul>
          <RouterLink class="mt-3 block text-sm text-[var(--primary)] hover:underline" to="/api-keys">
            Manage API keys →
          </RouterLink>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
