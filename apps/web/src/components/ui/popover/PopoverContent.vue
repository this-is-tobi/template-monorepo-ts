<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { PopoverContent, PopoverPortal } from 'reka-ui'

const props = withDefaults(defineProps<{
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}>(), {
  align: 'center',
  sideOffset: 4,
})
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      :align="props.align"
      :side-offset="props.sideOffset"
      :class="cn(
        'z-50 w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        $attrs.class as string,
      )"
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>
