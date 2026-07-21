<script setup lang="ts">
import { PopoverRoot } from 'reka-ui'

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <PopoverRoot v-model:open="open">
    <slot />
  </PopoverRoot>
</template>
