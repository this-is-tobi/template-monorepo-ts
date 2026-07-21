<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <th :class="cn('h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground', $attrs.class as string)">
    <slot />
  </th>
</template>
