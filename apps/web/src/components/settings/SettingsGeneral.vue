<script setup lang="ts">
import type { AppConfig } from '@template-monorepo-ts/shared'
import { AppConfigSchema } from '@template-monorepo-ts/shared'
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import PageSkeleton from '~/components/PageSkeleton.vue'
import SettingsField from '~/components/settings/SettingsField.vue'
import { Alert } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { NumberInput } from '~/components/ui/number-input'
import { Switch } from '~/components/ui/switch'
import { useConfirm } from '~/composables/useConfirm'
import { useNotify } from '~/composables/useNotify'
import { apiClient } from '~/lib/api'
import { useConfigStore } from '~/stores/config'

const configStore = useConfigStore()
const notify = useNotify()
const confirm = useConfirm()

const loading = ref(true)
const saving = ref(false)
/** Set when the config could not be read — the form must not render on top of it. */
const loadError = ref('')
const saveError = ref('')

/** Defaults come from the schema, so a new setting cannot be missed here. */
const form = ref<AppConfig>(AppConfigSchema.parse({}))
/** Last known server state, for dirty checking and Reset. */
const saved = ref<AppConfig>(AppConfigSchema.parse({}))

const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(saved.value))

/**
 * Turning maintenance mode on signs every non-admin out of the product, so it
 * gets an explicit confirmation rather than riding along with a Save click.
 */
const enablingMaintenance = computed(() => form.value.maintenanceMode && !saved.value.maintenanceMode)

async function fetchConfig() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await apiClient.config.get()
    form.value = { ...data.data }
    saved.value = { ...data.data }
    configStore.lockedFields = data.lockedFields ?? []
  } catch {
    // Deliberately leaves the form unrendered: showing schema defaults next to
    // an enabled Save button invites overwriting live config with template
    // values on a transient network error.
    loadError.value = 'Failed to load configuration. Nothing has been changed.'
  } finally {
    loading.value = false
  }
}

async function persist() {
  saving.value = true
  saveError.value = ''
  try {
    const { data } = await apiClient.config.update(form.value)
    form.value = { ...data.data }
    saved.value = { ...data.data }
    configStore.config = { ...data.data }
    notify.success('Configuration saved')
  } catch (err) {
    saveError.value = 'Failed to save configuration'
    notify.error('Could not save configuration', err)
  } finally {
    saving.value = false
  }
}

function handleSave() {
  if (!dirty.value) return
  if (!enablingMaintenance.value) {
    void persist()
    return
  }
  confirm.require({
    header: 'Enable maintenance mode?',
    message: 'Every non-admin user will be locked out of the application until you turn this off. Administrators keep full access.',
    acceptProps: { label: 'Enable maintenance mode', severity: 'danger' },
    rejectProps: { label: 'Cancel' },
    accept: () => void persist(),
  })
}

function handleReset() {
  form.value = { ...saved.value }
  saveError.value = ''
}

onMounted(fetchConfig)

// Unsaved platform settings are easy to lose on a stray sidebar click.
onBeforeRouteLeave(() => {
  if (!dirty.value) return true
  // eslint-disable-next-line no-alert
  return window.confirm('You have unsaved configuration changes. Leave without saving?')
})
</script>

<template>
  <div class="flex max-w-xl flex-col gap-6">
    <div>
      <h2 class="text-xl font-semibold tracking-tight text-[var(--app-fg)]">
        General
      </h2>
      <p class="text-sm text-[var(--app-muted)]">
        Platform-wide settings. Changes apply immediately for all users.
      </p>
    </div>

    <PageSkeleton v-if="loading" />

    <Alert v-else-if="loadError" variant="destructive">
      {{ loadError }}
      <Button variant="outline" size="sm" class="mt-3 w-fit" @click="fetchConfig">
        Try again
      </Button>
    </Alert>

    <template v-else>
      <!-- Branding -->
      <section class="flex flex-col gap-4">
        <h3 class="text-sm font-medium text-[var(--app-fg)]">
          Branding
        </h3>
        <SettingsField
          v-slot="{ id, locked }"
          name="appName"
          label="Application name"
          description="Displayed in the header and on the login page."
        >
          <Input :id="id" v-model="form.appName" :disabled="locked" class="w-full" />
        </SettingsField>
        <SettingsField
          v-slot="{ id, locked }"
          name="documentationUrl"
          label="Documentation URL"
          description="Link shown in the sidebar. Leave empty to hide."
        >
          <Input
            :id="id"
            v-model="form.documentationUrl"
            :disabled="locked"
            placeholder="https://docs.example.com"
            class="w-full"
          />
        </SettingsField>
      </section>

      <div class="border-t border-border" />

      <!-- Authentication -->
      <section class="flex flex-col gap-4">
        <h3 class="text-sm font-medium text-[var(--app-fg)]">
          Authentication
        </h3>
        <SettingsField
          v-slot="{ id, locked }"
          inline
          name="enableRegistration"
          label="Enable registration"
          description="Allow new users to create accounts."
        >
          <Switch :id="id" v-model="form.enableRegistration" :disabled="locked" />
        </SettingsField>
        <SettingsField
          v-slot="{ id, locked }"
          inline
          name="allowOrganizationCreation"
          label="Allow organization creation"
          description="Allow users to create new organizations."
        >
          <Switch :id="id" v-model="form.allowOrganizationCreation" :disabled="locked" />
        </SettingsField>
      </section>

      <div class="border-t border-border" />

      <!-- Quotas -->
      <section class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-medium text-[var(--app-fg)]">
            Quotas
          </h3>
          <p class="text-xs text-[var(--app-muted)]">
            Leave empty for unlimited.
          </p>
        </div>
        <SettingsField
          v-slot="{ id, locked }"
          name="maxOrganizationsPerUser"
          label="Max organizations per user"
          description="Maximum number of organizations a user can create."
        >
          <NumberInput :id="id" v-model="form.maxOrganizationsPerUser" :disabled="locked" :min="0" class="w-full" />
        </SettingsField>
        <SettingsField
          v-slot="{ id, locked }"
          name="maxProjectsPerOrg"
          label="Max projects per organization"
          description="Default project limit for all organizations. Can be overridden per organization."
        >
          <NumberInput :id="id" v-model="form.maxProjectsPerOrg" :disabled="locked" :min="0" class="w-full" />
        </SettingsField>
      </section>

      <div class="border-t border-border" />

      <!-- Data retention -->
      <section class="flex flex-col gap-4">
        <h3 class="text-sm font-medium text-[var(--app-fg)]">
          Data retention
        </h3>
        <SettingsField
          v-slot="{ id, locked }"
          name="auditRetentionDays"
          label="Audit log retention (days)"
          description="Audit entries older than this are purged daily. Set to 0 to keep them forever."
        >
          <NumberInput :id="id" v-model="form.auditRetentionDays" :disabled="locked" :min="0" class="w-full" />
        </SettingsField>
      </section>

      <div class="border-t border-border" />

      <!-- System -->
      <section class="flex flex-col gap-4">
        <h3 class="text-sm font-medium text-[var(--app-fg)]">
          System
        </h3>
        <SettingsField
          v-slot="{ id, locked }"
          inline
          name="maintenanceMode"
          label="Maintenance mode"
          description="Block non-admin users and show a maintenance banner."
        >
          <Switch :id="id" v-model="form.maintenanceMode" :disabled="locked" />
        </SettingsField>
        <Alert v-if="enablingMaintenance" variant="warning">
          Saving will lock every non-admin user out of the application.
        </Alert>
      </section>

      <div class="border-t border-border" />

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <Button :loading="saving" :disabled="!dirty" @click="handleSave">
          Save changes
        </Button>
        <Button v-if="dirty" variant="ghost" @click="handleReset">
          Cancel
        </Button>
        <span v-if="dirty" class="text-xs text-[var(--app-muted)]">
          Unsaved changes
        </span>
      </div>

      <Alert v-if="saveError" variant="destructive">
        {{ saveError }}
      </Alert>
    </template>
  </div>
</template>
