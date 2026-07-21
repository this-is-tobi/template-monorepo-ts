<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <td :class="cn('px-3 py-2.5 align-middle', $attrs.class as string)">
    <slot />
  </td>
</template>
