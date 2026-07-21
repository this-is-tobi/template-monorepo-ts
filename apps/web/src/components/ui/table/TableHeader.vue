<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <thead :class="cn('[&_tr]:border-b [&_tr]:border-border', $attrs.class as string)">
    <slot />
  </thead>
</template>
