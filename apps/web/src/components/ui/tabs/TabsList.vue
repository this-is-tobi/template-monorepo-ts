<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { TabsList } from 'reka-ui'
</script>

<template>
  <TabsList :class="cn('inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground', $attrs.class as string)">
    <slot />
  </TabsList>
</template>
