<script setup lang="ts">
import type { ProjectServiceKey } from '@template-monorepo-ts/shared'
import { PERMISSION_MATRIX } from '@template-monorepo-ts/shared'
import { computed, onMounted, ref } from 'vue'
import RelativeTime from '~/components/RelativeTime.vue'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select'
import { useConfirm } from '~/composables/useConfirm'
import { useNotify } from '~/composables/useNotify'
import { apiClient } from '~/lib/api'

/**
 * API keys owned by the project rather than by a person.
 *
 * The point of the section is that these outlive whoever created them, so it
 * deliberately shows no author — the owner is the project.
 */
const props = defineProps<{
  projectId: string
  /** Only project owners and admins may mint or revoke. */
  canManage: boolean
}>()

const notify = useNotify()
const confirm = useConfirm()

const keys = ref<ProjectServiceKey[]>([])
const loading = ref(true)
const loadError = ref(false)

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const form = ref<{ name: string, expiresIn?: number, permissions: Record<string, string[]> }>({
  name: '',
  permissions: {},
})

/** The secret, shown once and never retrievable again. */
const createdSecret = ref('')

const expirationOptions = [
  { label: 'Never', value: undefined },
  { label: '30 days', value: 60 * 60 * 24 * 30 },
  { label: '90 days', value: 60 * 60 * 24 * 90 },
  { label: '1 year', value: 60 * 60 * 24 * 365 },
]

const resources = Object.keys(PERMISSION_MATRIX)

/** A key with no permissions can do nothing, so refuse to mint one. */
const canSubmit = computed(() =>
  form.value.name.trim().length > 0 && Object.keys(form.value.permissions).length > 0,
)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const { data } = await apiClient.projects.getServiceKeys(props.projectId)
    keys.value = data.data
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

function hasPermission(resource: string, action: string) {
  return form.value.permissions[resource]?.includes(action) ?? false
}

function togglePermission(resource: string, action: string) {
  const current = form.value.permissions[resource] ?? []
  const next = current.includes(action) ? current.filter(a => a !== action) : [...current, action]
  if (next.length === 0) {
    const { [resource]: _dropped, ...rest } = form.value.permissions
    form.value.permissions = rest
  } else {
    form.value.permissions = { ...form.value.permissions, [resource]: next }
  }
}

function openCreate() {
  form.value = { name: '', permissions: {} }
  createError.value = ''
  showCreate.value = true
}

async function handleCreate() {
  creating.value = true
  createError.value = ''
  try {
    const { data } = await apiClient.projects.createServiceKey(props.projectId, {
      name: form.value.name.trim(),
      ...(form.value.expiresIn !== undefined ? { expiresIn: form.value.expiresIn } : {}),
      permissions: form.value.permissions,
    })
    createdSecret.value = data.key
    showCreate.value = false
    await load()
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'Failed to create key'
  } finally {
    creating.value = false
  }
}

function confirmRevoke(key: ProjectServiceKey) {
  confirm.require({
    header: 'Revoke this key?',
    message: `"${key.name ?? 'Unnamed key'}" stops working immediately, and anything using it starts failing. This cannot be undone.`,
    acceptProps: { label: 'Revoke', severity: 'danger' },
    accept: async () => {
      try {
        await apiClient.projects.revokeServiceKey(props.projectId, key.id)
        notify.success('Key revoked')
        await load()
      } catch {
        notify.error('Failed to revoke the key')
      }
    },
  })
}

async function copySecret() {
  await navigator.clipboard.writeText(createdSecret.value)
  notify.success('Key copied to clipboard')
}

function permissionSummary(permissions: Record<string, string[]> | null) {
  if (!permissions) return '—'
  return Object.entries(permissions).map(([r, a]) => `${r}:${a.join('/')}`).join(', ')
}
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0">
      <div>
        <CardTitle class="text-base">
          Service keys
        </CardTitle>
        <p class="text-xs text-[var(--app-muted)]">
          Owned by the project, not by you — they keep working after you leave.
        </p>
      </div>
      <Button
        v-if="canManage"
        size="sm"
        variant="outline"
        @click="openCreate"
      >
        New key
      </Button>
    </CardHeader>
    <CardContent>
      <p v-if="loading" class="text-sm text-[var(--app-muted)]">
        Loading…
      </p>
      <Alert v-else-if="loadError" variant="destructive">
        Failed to load service keys.
      </Alert>
      <p v-else-if="keys.length === 0" class="text-sm text-[var(--app-muted)]">
        No service keys yet. Create one to let CI or another machine act on this project.
      </p>
      <ul v-else class="flex flex-col divide-y divide-[var(--app-border)]">
        <li
          v-for="key in keys"
          :key="key.id"
          class="flex items-center justify-between gap-4 py-3"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-[var(--app-fg)]">{{ key.name ?? 'Unnamed key' }}</span>
              <Badge v-if="!key.enabled" variant="secondary">
                disabled
              </Badge>
            </div>
            <p class="text-xs text-[var(--app-muted)]">
              <span class="font-mono">{{ key.start ?? key.prefix ?? '—' }}…</span>
              · {{ permissionSummary(key.permissions) }}
              · last used <RelativeTime :value="key.lastRequest" placeholder="never" />
              <template v-if="key.expiresAt">
                · expires <RelativeTime :value="key.expiresAt" />
              </template>
            </p>
          </div>
          <Button
            v-if="canManage"
            size="sm"
            variant="destructive"
            @click="confirmRevoke(key)"
          >
            Revoke
          </Button>
        </li>
      </ul>
    </CardContent>
  </Card>

  <!-- Create -->
  <Dialog v-model:open="showCreate">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>New service key</DialogTitle>
      </DialogHeader>
      <form @submit.prevent="handleCreate">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label for="svckey-name">Name</label>
            <Input
              id="svckey-name"
              v-model="form.name"
              placeholder="e.g. CI pipeline"
              required
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="svckey-expiry">Expiration</label>
            <Select
              id="svckey-expiry"
              v-model="form.expiresIn"
              :options="expirationOptions"
              option-label="label"
              option-value="value"
            />
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium text-[var(--app-fg)]">Permissions</span>
            <p class="text-xs text-[var(--app-muted)]">
              Required — a key with none can do nothing. The key is locked to this project regardless.
            </p>
            <div class="border border-border rounded-md overflow-auto max-h-72">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-3 py-2 font-medium text-[var(--app-muted)]">
                      Resource
                    </th>
                    <th
                      v-for="action in ['create', 'read', 'update', 'delete']"
                      :key="action"
                      class="px-3 py-2 font-medium text-[var(--app-muted)] text-center"
                    >
                      {{ action }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="resource in resources"
                    :key="resource"
                    class="border-b border-border last:border-b-0"
                  >
                    <td class="px-3 py-2 font-medium text-[var(--app-fg)]">
                      {{ resource }}
                    </td>
                    <td
                      v-for="action in ['create', 'read', 'update', 'delete']"
                      :key="action"
                      class="px-3 py-2 text-center"
                    >
                      <Checkbox
                        v-if="PERMISSION_MATRIX[resource as keyof typeof PERMISSION_MATRIX]?.includes(action as never)"
                        :model-value="hasPermission(resource, action)"
                        @update:model-value="togglePermission(resource, action)"
                      />
                      <span v-else class="text-[var(--app-muted)]">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <Alert v-if="createError" variant="destructive">
            {{ createError }}
          </Alert>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <Button type="button" variant="secondary" @click="showCreate = false">
            Cancel
          </Button>
          <Button type="submit" :disabled="!canSubmit" :loading="creating">
            {{ creating ? 'Creating…' : 'Create key' }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>

  <!-- The secret, shown exactly once -->
  <Dialog :open="createdSecret !== ''" @update:open="(open: boolean) => !open && (createdSecret = '')">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Copy your key now</DialogTitle>
      </DialogHeader>
      <Alert variant="warning">
        This is the only time the key is shown. Store it somewhere safe before closing.
      </Alert>
      <code class="block break-all rounded-md bg-surface-100 p-3 font-mono text-xs dark:bg-surface-900">{{ createdSecret }}</code>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="copySecret">
          Copy
        </Button>
        <Button @click="createdSecret = ''">
          Done
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
