<script setup lang="ts">
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@template-monorepo-ts/ui'
import { cva } from 'class-variance-authority'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  variant?: AlertVariants['variant']
}>()

const alertVariants = cva(
  'relative flex w-full items-start gap-2.5 rounded-lg border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        default: 'border-border bg-card text-foreground',
        info: 'border-sky-500/30 bg-sky-500/5 text-sky-800 dark:text-sky-300',
        success: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300',
        warning: 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300',
        destructive: 'border-destructive/30 bg-destructive/5 text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type AlertVariants = VariantProps<typeof alertVariants>

const icon = computed(() => ({
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  destructive: AlertCircle,
}[props.variant ?? 'default']))
</script>

<template>
  <div role="alert" :class="cn(alertVariants({ variant: props.variant }), $attrs.class as string)">
    <component :is="icon" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <slot />
    </div>
  </div>
</template>
