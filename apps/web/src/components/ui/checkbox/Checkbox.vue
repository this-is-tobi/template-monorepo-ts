<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { Check } from 'lucide-vue-next'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'

const props = defineProps<{
  disabled?: boolean
  id?: string
}>()

const modelValue = defineModel<boolean>({ default: false })
</script>

<template>
  <CheckboxRoot
    :id="props.id"
    v-model="modelValue"
    :disabled="props.disabled"
    :class="cn(
      'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-colors',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground',
      $attrs.class as string,
    )"
  >
    <CheckboxIndicator class="flex items-center justify-center text-current">
      <Check class="size-3.5" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
