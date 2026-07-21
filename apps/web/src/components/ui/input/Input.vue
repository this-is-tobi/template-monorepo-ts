<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'

const props = defineProps<{
  type?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  minlength?: number | string
  maxlength?: number | string
}>()

const modelValue = defineModel<string | number | null>()
</script>

<template>
  <input
    v-model="modelValue"
    :type="props.type ?? 'text'"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :required="props.required"
    :minlength="props.minlength"
    :maxlength="props.maxlength"
    :class="cn(
      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      $attrs.class as string,
    )"
  >
</template>
