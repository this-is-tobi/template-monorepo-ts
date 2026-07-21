<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <tr :class="cn('border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', $attrs.class as string)">
    <slot />
  </tr>
</template>
