<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { TabsTrigger } from 'reka-ui'

const props = defineProps<{
  value: string
  disabled?: boolean
}>()
</script>

<template>
  <TabsTrigger
    :value="props.value"
    :disabled="props.disabled"
    :class="cn(
      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs',
      $attrs.class as string,
    )"
  >
    <slot />
  </TabsTrigger>
</template>
