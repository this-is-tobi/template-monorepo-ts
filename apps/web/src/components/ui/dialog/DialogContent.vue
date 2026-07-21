<script setup lang="ts">
import { cn } from '@template-monorepo-ts/ui'
import { X } from 'lucide-vue-next'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal } from 'reka-ui'

/** Hide the built-in close button — for chrome-less dialogs like ⌘K. */
defineProps<{ hideClose?: boolean }>()
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[4px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
    />
    <DialogContent
      :class="cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-lg',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        $attrs.class as string,
      )"
    >
      <slot />
      <DialogClose
        v-if="!hideClose"
        class="absolute right-4 top-4 flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-60 transition-opacity hover:opacity-100 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        aria-label="Close"
      >
        <X class="size-4" />
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
