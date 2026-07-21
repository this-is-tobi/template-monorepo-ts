<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <div :class="cn('flex items-center p-6 pt-0', $attrs.class as string)">
    <slot />
  </div>
</template>
