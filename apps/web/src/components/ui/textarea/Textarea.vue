<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'

const props = defineProps<{
  placeholder?: string
  disabled?: boolean
  rows?: number | string
}>()

const modelValue = defineModel<string | null>()
</script>

<template>
  <textarea
    v-model="modelValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :rows="props.rows"
    :class="cn(
      'flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      $attrs.class as string,
    )"
  />
</template>
