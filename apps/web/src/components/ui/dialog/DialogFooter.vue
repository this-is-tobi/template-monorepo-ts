<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <div :class="cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', $attrs.class as string)">
    <slot />
  </div>
</template>
