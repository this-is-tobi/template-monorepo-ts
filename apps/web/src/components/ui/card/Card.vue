<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <div :class="cn('rounded-lg border border-border bg-card text-card-foreground', $attrs.class as string)">
    <slot />
  </div>
</template>
