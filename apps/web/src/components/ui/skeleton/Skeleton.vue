<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
</script>

<template>
  <!-- .skeleton carries the shimmer animation defined in assets/index.css -->
  <div :class="cn('skeleton', $attrs.class as string)" />
</template>
