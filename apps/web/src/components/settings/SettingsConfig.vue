<script setup lang="ts">
import type { AppConfig } from '@template-monorepo-ts/shared'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ToggleSwitch from 'primevue/toggleswitch'
import { onMounted, ref } from 'vue'
import { apiClient } from '~/lib/api'
import { useConfigStore } from '~/stores/config'

const configStore = useConfigStore()
const loading = ref(true)
const saving = ref(false)
const saveSuccess = ref(false)
const error = ref('')

const form = ref<AppConfig>({
  enableRegistration: true,
})

async function fetchConfig() {
  loading.value = true
  try {
    const { data } = await apiClient.config.get()
    form.value = { ...data.data }
  } catch {
    error.value = 'Failed to load configuration'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  saveSuccess.value = false
  error.value = ''
  try {
    const { data } = await apiClient.config.update(form.value)
    form.value = { ...data.data }
    configStore.config = { ...data.data }
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch {
    error.value = 'Failed to save configuration'
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
      <!-- Authentication -->
      <div class="flex flex-col gap-4">
        <h3 class="text-sm font-medium text-[var(--app-fg)]">
          Authentication
        </h3>
        <div class="flex items-center justify-between max-w-md">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm text-[var(--app-fg)]">Enable registration</span>
            <span class="text-xs text-[var(--app-muted)]">Allow new users to create accounts.</span>
          </div>
          <ToggleSwitch v-model="form.enableRegistration" />
        </div>
      </div>

      <div class="border-t border-surface" />

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <Button
          label="Save"
          :loading="saving"
          @click="handleSave"
        />
        <Message
          v-if="saveSuccess"
          severity="success"
          class="ml-2"
        >
          Configuration saved
        </Message>
        <Message
          v-if="error"
          severity="error"
          class="ml-2"
        >
          {{ error }}
        </Message>
      </div>
    </template>
  </div>
</template>
