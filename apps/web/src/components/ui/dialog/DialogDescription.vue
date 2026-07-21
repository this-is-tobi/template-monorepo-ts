<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { DialogDescription } from 'reka-ui'
</script>

<template>
  <DialogDescription :class="cn('text-sm text-muted-foreground', $attrs.class as string)">
    <slot />
  </DialogDescription>
</template>
