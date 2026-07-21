<script setup lang="ts">
import { TabsRoot } from 'reka-ui'

/**
 * Tabs container. Two usage modes:
 *  - uncontrolled: `<Tabs default-value="details">` (most pages)
 *  - controlled:   `<Tabs v-model="tab">`
 */
const props = defineProps<{
  defaultValue?: string
}>()

const modelValue = defineModel<string>()
</script>

<template>
  <TabsRoot
    v-if="props.defaultValue !== undefined"
    :default-value="props.defaultValue"
  >
    <slot />
  </TabsRoot>
  <TabsRoot v-else v-model="modelValue">
    <slot />
  </TabsRoot>
</template>
