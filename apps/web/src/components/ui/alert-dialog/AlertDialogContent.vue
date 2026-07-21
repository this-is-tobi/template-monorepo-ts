<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { AlertDialogContent, AlertDialogOverlay, AlertDialogPortal } from 'reka-ui'
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[4px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
    />
    <AlertDialogContent
      :class="cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-lg',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        $attrs.class as string,
      )"
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
