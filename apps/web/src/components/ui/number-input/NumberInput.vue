<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { computed } from 'vue'

/**
 * Numeric input with explicit empty semantics: clearing the field yields
 * `null` (not 0 / NaN), which the settings forms use for "unlimited".
 */
const props = defineProps<{
  min?: number
  max?: number
  disabled?: boolean
  placeholder?: string
  id?: string
}>()

const modelValue = defineModel<number | null>()

const rawValue = computed({
  get: () => modelValue.value == null ? '' : String(modelValue.value),
  set: (raw: string) => {
    if (raw.trim() === '') {
      modelValue.value = null
      return
    }
    const parsed = Number(raw)
    modelValue.value = Number.isFinite(parsed) ? parsed : null
  },
})
</script>

<template>
  <input
    :id="props.id"
    v-model="rawValue"
    type="number"
    inputmode="numeric"
    :min="props.min"
    :max="props.max"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    :class="cn(
      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      $attrs.class as string,
    )"
  >
</template>
