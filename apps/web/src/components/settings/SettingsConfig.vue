<script setup lang="ts">
import type { AppConfig } from '@template-monorepo-ts/shared'
import { onMounted, ref } from 'vue'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { NumberInput } from '~/components/ui/number-input'
import { Switch } from '~/components/ui/switch'
import { useNotify } from '~/composables/useNotify'
import { apiClient } from '~/lib/api'
import { useConfigStore } from '~/stores/config'

const configStore = useConfigStore()
const notify = useNotify()
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const form = ref<AppConfig>({
  enableRegistration: true,
  allowOrganizationCreation: true,
  appName: 'Template Monorepo TS',
  documentationUrl: '',
  maintenanceMode: false,
  maxOrganizationsPerUser: null,
  maxProjectsPerOrg: null,
})

function isLocked(field: keyof AppConfig): boolean {
  return configStore.lockedFields.includes(field)
}

async function fetchConfig() {
  loading.value = true
  try {
    const { data } = await apiClient.config.get()
    form.value = { ...data.data }
    configStore.lockedFields = data.lockedFields ?? []
  } catch {
    error.value = 'Failed to load configuration'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  error.value = ''
  try {
    const { data } = await apiClient.config.update(form.value)
    form.value = { ...data.data }
    configStore.config = { ...data.data }
    notify.success('Configuration saved')
  } catch (err) {
    error.value = 'Failed to save configuration'
    notify.error('Could not save configuration', err)
  } finally {
    saving.value = false
  }
}

onMounted(fetchConfig)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2 class="text-xl font-semibold tracking-tight text-[var(--app-fg)]">
        Configuration
      </h2>
      <p class="text-sm text-[var(--app-muted)]">
        Manage platform-wide settings.
      </p>
    </div>

    <template v-if="!loading">
      <!-- General -->
      <div class="flex flex-col gap-4">
        <h3 class="text-sm font-medium text-[var(--app-fg)]">
          General
        </h3>
        <div class="flex flex-col gap-1 max-w-md">
          <div class="flex items-center gap-2">
            <label class="text-sm text-[var(--app-fg)]" for="appName">Application name</label>
            <Badge v-if="isLocked('appName')" variant="secondary" class="text-xs">
              env
            </Badge>
          </div>
          <span class="text-xs text-[var(--app-muted)]">Displayed in the header and login page.</span>
          <Input id="appName" v-model="form.appName" :disabled="isLocked('appName')" class="w-full" />
        </div>
        <div class="flex flex-col gap-1 max-w-md">
          <div class="flex items-center gap-2">
            <label class="text-sm text-[var(--app-fg)]" for="documentationUrl">Documentation URL</label>
            <Badge v-if="isLocked('documentationUrl')" variant="secondary" class="text-xs">
              env
            </Badge>
          </div>
          <span class="text-xs text-[var(--app-muted)]">Link shown in the sidebar. Leave empty to hide.</span>
          <Input id="documentationUrl" v-model="form.documentationUrl" :disabled="isLocked('documentationUrl')" placeholder="https://docs.example.com" class="w-full" />
        </div>
      </div>

      <div class="border-t border-border" />

      <!-- Authentication -->
      <div class="flex flex-col gap-4">
        <h3 class="text-sm font-medium text-[var(--app-fg)]">
          Authentication
        </h3>
        <div class="flex items-center justify-between max-w-md">
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2">
              <span class="text-sm text-[var(--app-fg)]">Enable registration</span>
              <Badge v-if="isLocked('enableRegistration')" variant="secondary" class="text-xs">
                env
              </Badge>
            </div>
            <span class="text-xs text-[var(--app-muted)]">Allow new users to create accounts.</span>
          </div>
          <Switch v-model="form.enableRegistration" :disabled="isLocked('enableRegistration')" />
        </div>
        <div class="flex items-center justify-between max-w-md">
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2">
              <span class="text-sm text-[var(--app-fg)]">Allow organization creation</span>
              <Badge v-if="isLocked('allowOrganizationCreation')" variant="secondary" class="text-xs">
                env
              </Badge>
            </div>
            <span class="text-xs text-[var(--app-muted)]">Allow users to create new organizations.</span>
          </div>
          <Switch v-model="form.allowOrganizationCreation" :disabled="isLocked('allowOrganizationCreation')" />
        </div>
      </div>

      <div class="border-t border-border" />

      <!-- Quotas -->
      <div class="flex flex-col gap-4">
        <h3 class="text-sm font-medium text-[var(--app-fg)]">
          Quotas
        </h3>
        <p class="text-xs text-[var(--app-muted)]">
          Leave empty for unlimited.
        </p>
        <div class="flex flex-col gap-1 max-w-md">
          <div class="flex items-center gap-2">
            <label class="text-sm text-[var(--app-fg)]" for="maxOrganizationsPerUser">Max organizations per user</label>
            <Badge v-if="isLocked('maxOrganizationsPerUser')" variant="secondary" class="text-xs">
              env
            </Badge>
          </div>
          <span class="text-xs text-[var(--app-muted)]">Maximum number of organizations a user can create.</span>
          <NumberInput id="maxOrganizationsPerUser" v-model="form.maxOrganizationsPerUser" :disabled="isLocked('maxOrganizationsPerUser')" :min="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1 max-w-md">
          <div class="flex items-center gap-2">
            <label class="text-sm text-[var(--app-fg)]" for="maxProjectsPerOrg">Max projects per organization</label>
            <Badge v-if="isLocked('maxProjectsPerOrg')" variant="secondary" class="text-xs">
              env
            </Badge>
          </div>
          <span class="text-xs text-[var(--app-muted)]">Default project limit for all organizations. Can be overridden per organization.</span>
          <NumberInput id="maxProjectsPerOrg" v-model="form.maxProjectsPerOrg" :disabled="isLocked('maxProjectsPerOrg')" :min="0" class="w-full" />
        </div>
      </div>

      <div class="border-t border-border" />

      <!-- System -->
      <div class="flex flex-col gap-4">
        <h3 class="text-sm font-medium text-[var(--app-fg)]">
          System
        </h3>
        <div class="flex items-center justify-between max-w-md">
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2">
              <span class="text-sm text-[var(--app-fg)]">Maintenance mode</span>
              <Badge v-if="isLocked('maintenanceMode')" variant="secondary" class="text-xs">
                env
              </Badge>
            </div>
            <span class="text-xs text-[var(--app-muted)]">Block non-admin users and show a maintenance banner.</span>
          </div>
          <Switch v-model="form.maintenanceMode" :disabled="isLocked('maintenanceMode')" />
        </div>
      </div>

      <div class="border-t border-border" />

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <Button
          :loading="saving"
          @click="handleSave"
        >
          Save
        </Button>
        <Alert
          v-if="error"
          variant="destructive"
          class="ml-2 w-auto"
        >
          {{ error }}
        </Alert>
      </div>
    </template>
  </div>
</template>
