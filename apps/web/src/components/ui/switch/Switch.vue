<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { SwitchRoot, SwitchThumb } from 'reka-ui'

const props = defineProps<{
  disabled?: boolean
  id?: string
}>()

const modelValue = defineModel<boolean>({ default: false })
</script>

<template>
  <SwitchRoot
    :id="props.id"
    v-model="modelValue"
    :disabled="props.disabled"
    :class="cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-colors',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
      $attrs.class as string,
    )"
  >
    <SwitchThumb
      class="pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5"
    />
  </SwitchRoot>
</template>
