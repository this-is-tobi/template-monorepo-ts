<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <div :class="cn('flex flex-col gap-1.5 p-6', $attrs.class as string)">
    <slot />
  </div>
</template>
