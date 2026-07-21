<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <p :class="cn('text-sm text-muted-foreground', $attrs.class as string)">
    <slot />
  </p>
</template>
