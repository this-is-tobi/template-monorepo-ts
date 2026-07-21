<script setup lang="ts">
import { AlertDialogRoot } from 'reka-ui'

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <slot />
  </AlertDialogRoot>
</template>
