<script setup lang="ts">
import type { ThemeColorName } from '@template-monorepo-ts/shared'
import { Check } from 'lucide-vue-next'

/**
 * Visual color palette picker — renders one swatch per Tailwind palette
 * name so admins pick a theme color by sight instead of by name.
 */
defineProps<{
  modelValue: ThemeColorName
  options: readonly ThemeColorName[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: ThemeColorName] }>()

/**
 * Representative hex (Tailwind 500 shade) for each palette name — display
 * only; the actual theme tokens are resolved by PrimeVue from the name.
 */
const SWATCH_HEX: Record<ThemeColorName, string> = {
  zinc: '#71717a',
  slate: '#64748b',
  stone: '#78716c',
  gray: '#6b7280',
  neutral: '#737373',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
}

function hexFor(name: ThemeColorName): string {
  return SWATCH_HEX[name]
}
</script>

<template>
  <div class="flex flex-wrap gap-2" role="radiogroup">
    <button
      v-for="name in options"
      :key="name"
      type="button"
      class="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      :class="modelValue === name ? 'border-[var(--app-fg)]' : 'border-transparent'"
      :style="{ backgroundColor: hexFor(name) }"
      :title="name"
      :aria-label="name"
      role="radio"
      :aria-checked="modelValue === name"
      @click="emit('update:modelValue', name)"
    >
      <Check v-if="modelValue === name" :size="14" class="text-white drop-shadow" />
    </button>
  </div>
</template>
