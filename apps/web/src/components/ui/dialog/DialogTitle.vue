<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { DialogTitle } from 'reka-ui'
</script>

<template>
  <DialogTitle :class="cn('text-lg font-semibold leading-none tracking-tight', $attrs.class as string)">
    <slot />
  </DialogTitle>
</template>
