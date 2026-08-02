<script setup lang="ts">
import type { ThemeConfig } from '@template-monorepo-ts/shared'
import { ThemeColorNames } from '@template-monorepo-ts/shared'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ColorSwatchPicker from '~/components/ColorSwatchPicker.vue'
import { Alert } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { useNotify } from '~/composables/useNotify'
import { useThemeStore } from '~/stores/theme'

const themeStore = useThemeStore()
const notify = useNotify()
const saving = ref(false)
const jsonError = ref('')

function currentPresetJson(): string {
  return themeStore.theme.preset ? JSON.stringify(themeStore.theme.preset, null, 2) : ''
}

const form = ref<ThemeConfig>({
  primaryColor: themeStore.theme.primaryColor,
  surfaceColor: themeStore.theme.surfaceColor,
  logoUrl: themeStore.theme.logoUrl ?? '',
})

const presetJson = ref(currentPresetJson())

const dirty = computed(() =>
  form.value.primaryColor !== themeStore.theme.primaryColor
  || form.value.surfaceColor !== themeStore.theme.surfaceColor
  || (form.value.logoUrl ?? '') !== (themeStore.theme.logoUrl ?? '')
  || presetJson.value !== currentPresetJson(),
)

watch(() => ({ primaryColor: form.value.primaryColor, surfaceColor: form.value.surfaceColor }), () => {
  themeStore.previewTheme(form.value)
})

/**
 * Previewing writes the palette straight onto `:root`, which is global — the
 * whole app, not just this page. Without this the picked colours followed the
 * user around after navigating away and then silently vanished on the next
 * reload, which reads exactly like "my save didn't work".
 */
onBeforeUnmount(() => {
  if (dirty.value) themeStore.previewTheme(themeStore.theme)
})

function buildPayload(): ThemeConfig {
  const payload: ThemeConfig = {
    primaryColor: form.value.primaryColor,
    surfaceColor: form.value.surfaceColor,
  }
  if (form.value.logoUrl) {
    payload.logoUrl = form.value.logoUrl
  }
  if (presetJson.value.trim()) {
    try {
      payload.preset = JSON.parse(presetJson.value)
      jsonError.value = ''
    } catch {
      jsonError.value = 'Invalid JSON'
      throw new Error('Invalid JSON in preset override')
    }
  }
  return payload
}

async function handleSave() {
  saving.value = true
  try {
    const payload = buildPayload()
    await themeStore.updateTheme(payload)
    notify.success('Theme saved', 'Applied for all users')
  } catch (err) {
    if (!jsonError.value) notify.error('Could not save theme', err)
  } finally {
    saving.value = false
  }
}

function handleReset() {
  form.value = {
    primaryColor: themeStore.theme.primaryColor,
    surfaceColor: themeStore.theme.surfaceColor,
    logoUrl: themeStore.theme.logoUrl ?? '',
  }
  presetJson.value = currentPresetJson()
  jsonError.value = ''
  themeStore.previewTheme(themeStore.theme)
}
</script>

<template>
  <div class="flex max-w-xl flex-col gap-6">
    <div>
      <h2 class="text-xl font-semibold tracking-tight text-[var(--app-fg)]">
        Theme
      </h2>
      <p class="text-sm text-[var(--app-muted)]">
        Customize the application appearance for all users.
      </p>
    </div>

    <!--
      The preview repaints the whole app, so an unsaved state is easy to
      mistake for a saved one. Say so explicitly.
    -->
    <Alert v-if="dirty" variant="warning">
      Previewing unsaved changes — only you can see them, and they revert if you leave this page.
    </Alert>

    <!-- Colors -->
    <div class="flex flex-col gap-4">
      <h3 class="text-sm font-medium text-[var(--app-fg)]">
        Colors
      </h3>
      <div class="flex flex-col gap-2">
        <span class="text-sm text-[var(--app-fg)]">Primary color — <span class="capitalize text-[var(--app-muted)]">{{ form.primaryColor }}</span></span>
        <ColorSwatchPicker
          v-model="form.primaryColor"
          :options="ThemeColorNames"
        />
        <p class="text-xs text-[var(--app-muted)]">
          The main accent color used for buttons, links, and highlights. Changes preview live.
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-sm text-[var(--app-fg)]">Surface color — <span class="capitalize text-[var(--app-muted)]">{{ form.surfaceColor }}</span></span>
        <ColorSwatchPicker
          v-model="form.surfaceColor"
          :options="ThemeColorNames"
        />
        <p class="text-xs text-[var(--app-muted)]">
          The neutral palette used for backgrounds, borders, and text. Changes preview live.
        </p>
      </div>
    </div>

    <div class="border-t border-border" />

    <!-- Branding -->
    <div class="flex flex-col gap-4">
      <h3 class="text-sm font-medium text-[var(--app-fg)]">
        Branding
      </h3>
      <div class="flex flex-col gap-2">
        <label
          for="logoUrl"
          class="text-sm text-[var(--app-fg)]"
        >Logo URL</label>
        <Input
          id="logoUrl"
          v-model="form.logoUrl"
          placeholder="https://example.com/logo.svg"
          class="w-full max-w-sm"
        />
        <p class="text-xs text-[var(--app-muted)]">
          Public URL of the logo displayed in the navigation bar. Leave empty to use the default text logo.
        </p>
      </div>
      <div
        v-if="form.logoUrl"
        class="flex items-center gap-3 rounded-md border border-border bg-[var(--app-bg)] p-4 max-w-sm"
      >
        <img
          :src="form.logoUrl"
          alt="Logo preview"
          class="h-8 max-w-[200px] object-contain"
        >
        <span class="text-sm text-[var(--app-muted)]">Preview</span>
      </div>
    </div>

    <div class="border-t border-border" />

    <!-- Advanced -->
    <div class="flex flex-col gap-4">
      <h3 class="text-sm font-medium text-[var(--app-fg)]">
        Advanced
      </h3>
      <p class="text-sm text-[var(--app-muted)]">
        Provide CSS design-token overrides as JSON — keys must be CSS custom
        properties (e.g. <code class="font-mono">--radius</code>,
        <code class="font-mono">--primary</code>). Applied on top of the
        palettes selected above.
      </p>
      <Textarea
        v-model="presetJson"
        rows="10"
        class="w-full max-w-xl font-mono text-sm"
        placeholder="{ &quot;--radius&quot;: &quot;0.75rem&quot; }"
      />
      <Alert
        v-if="jsonError"
        variant="destructive"
      >
        {{ jsonError }}
      </Alert>
    </div>

    <div class="border-t border-border" />

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <Button
        :loading="saving"
        :disabled="!dirty"
        @click="handleSave"
      >
        Save changes
      </Button>
      <Button
        v-if="dirty"
        variant="ghost"
        @click="handleReset"
      >
        Cancel
      </Button>
    </div>
  </div>
</template>
