<script setup lang="ts">
import type { ButtonVariants } from './variants'
import { cn } from '@template-monorepo-ts/ui'
import { Loader2 } from 'lucide-vue-next'
import { buttonVariants } from './variants'

const props = withDefaults(defineProps<{
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  /** Shows a spinner and disables the button while a mutation is in flight. */
  loading?: boolean
}>(), {
  type: 'button',
})
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), $attrs.class as string)"
  >
    <Loader2 v-if="props.loading" class="size-4 animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
