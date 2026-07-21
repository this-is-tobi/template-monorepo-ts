<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { Label as RekaLabel } from 'reka-ui'

const props = defineProps<{
  for?: string
}>()
</script>

<template>
  <RekaLabel
    :for="props.for"
    :class="cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', $attrs.class as string)"
  >
    <slot />
  </RekaLabel>
</template>
