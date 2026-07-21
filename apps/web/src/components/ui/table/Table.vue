<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <div class="relative w-full overflow-x-auto">
    <table :class="cn('w-full caption-bottom text-sm', $attrs.class as string)">
      <slot />
    </table>
  </div>
</template>
