<script setup lang="ts">
import type { AppConfig } from '@template-monorepo-ts/shared'
import { camelCaseToSnakeCase } from '@template-monorepo-ts/shared'
import { computed } from 'vue'
import { Badge } from '~/components/ui/badge'
import { Label } from '~/components/ui/label'
import { useConfigStore } from '~/stores/config'

/**
 * One row of a settings form: label, optional "env" lock marker, description,
 * and the control itself in the default slot.
 *
 * Every field in the platform config form has the same anatomy, so it lives
 * here once — adding a setting is a matter of dropping in a control, not
 * re-copying five elements of markup and hoping the lock badge is wired up.
 *
 * Locking is read from the config store rather than passed in, so a field can
 * never render as editable just because a caller forgot the prop.
 */
const props = withDefaults(defineProps<{
  /** Config key this field edits. Drives both the lock state and the `for`/`id` link. */
  name: keyof AppConfig
  label: string
  description?: string
  /**
   * Put the control on the same row, right-aligned. Suits switches; text and
   * number inputs read better stacked beneath their label.
   */
  inline?: boolean
}>(), {
  inline: false,
})

const configStore = useConfigStore()

/** Whether an operator pinned this setting via env var or config file. */
const locked = computed(() => configStore.lockedFields.includes(props.name))

/**
 * The env var an operator would edit to change a locked value — shown in the
 * badge tooltip so "why can't I edit this?" has an actionable answer instead
 * of a bare `env` chip.
 */
const envVar = computed(() => `PLATFORM__${camelCaseToSnakeCase(props.name)}`)

const lockTitle = computed(() =>
  `Set by ${envVar.value} on the server. Edit your environment or config file to change it, or unset it to manage this here.`,
)
</script>

<template>
  <div
    class="flex gap-x-8 gap-y-1.5"
    :class="inline ? 'items-center justify-between' : 'flex-col'"
  >
    <div class="flex min-w-0 flex-col gap-0.5">
      <div class="flex items-center gap-2">
        <Label :for="name" class="text-sm text-[var(--app-fg)]">
          {{ label }}
        </Label>
        <Badge
          v-if="locked"
          variant="secondary"
          class="cursor-help text-xs font-normal"
          :title="lockTitle"
        >
          env
        </Badge>
      </div>
      <p v-if="description" class="text-xs text-[var(--app-muted)]">
        {{ description }}
      </p>
    </div>

    <!--
      `id` is handed back so the control cannot drift from the label's `for`,
      and `locked` lets it disable itself without re-deriving the state.
    -->
    <slot :id="name" :locked="locked" />
  </div>
</template>
