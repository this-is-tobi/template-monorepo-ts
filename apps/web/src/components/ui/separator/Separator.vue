<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { Separator } from 'reka-ui'

const props = withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
}>(), {
  orientation: 'horizontal',
})
</script>

<template>
  <Separator
    :orientation="props.orientation"
    :class="cn(
      'shrink-0 bg-border',
      props.orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      $attrs.class as string,
    )"
  />
</template>
