<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { buttonVariants } from '~/components/ui/button'
import { useConfirmState } from '~/composables/useConfirm'

/**
 * Global confirm dialog — mounted once in App.vue, driven by `useConfirm()`.
 */
const { state, accept, reject, dismiss } = useConfirmState()

const acceptClass = computed(() => buttonVariants({
  variant: state.value.acceptProps?.severity === 'danger' ? 'destructive' : 'default',
}))

const rejectClass = computed(() => buttonVariants({ variant: 'outline' }))
</script>

<template>
  <AlertDialog :open="state.open" @update:open="(open: boolean) => !open && dismiss()">
    <AlertDialogContent>
      <div class="flex flex-col gap-1.5 text-left">
        <AlertDialogTitle class="text-lg font-semibold leading-none tracking-tight">
          {{ state.header }}
        </AlertDialogTitle>
        <AlertDialogDescription class="text-sm text-muted-foreground">
          {{ state.message }}
        </AlertDialogDescription>
      </div>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AlertDialogCancel :class="rejectClass" @click="reject">
          {{ state.rejectProps?.label ?? 'Cancel' }}
        </AlertDialogCancel>
        <AlertDialogAction :class="acceptClass" @click="accept">
          {{ state.acceptProps?.label ?? 'Confirm' }}
        </AlertDialogAction>
      </div>
    </AlertDialogContent>
  </AlertDialog>
</template>
