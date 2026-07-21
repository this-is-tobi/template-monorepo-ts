<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { TabsContent } from 'reka-ui'

const props = defineProps<{
  value: string
}>()
</script>

<template>
  <TabsContent :value="props.value" :class="cn('mt-4 focus-visible:outline-none', $attrs.class as string)">
    <slot />
  </TabsContent>
</template>
