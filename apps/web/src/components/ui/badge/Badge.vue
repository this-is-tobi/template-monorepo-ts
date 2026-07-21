<script setup lang="ts">
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@template-monorepo-ts/ui'
import { cva } from 'class-variance-authority'

const props = defineProps<{
  variant?: BadgeVariants['variant']
}>()

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
        warning: 'border-transparent bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
        info: 'border-transparent bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeVariants = VariantProps<typeof badgeVariants>
</script>

<template>
  <span :class="cn(badgeVariants({ variant: props.variant }), $attrs.class as string)">
    <slot />
  </span>
</template>
