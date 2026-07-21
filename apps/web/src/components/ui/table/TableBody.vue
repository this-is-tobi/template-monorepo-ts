<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <tbody :class="cn('[&_tr:last-child]:border-0', $attrs.class as string)">
    <slot />
  </tbody>
</template>
