<script setup lang="ts" generic="T extends Record<string, any>">
import { cn } from '@template-monorepo-ts/ui'
import { ChevronDown } from 'lucide-vue-next'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed } from 'vue'
import { Checkbox } from '~/components/ui/checkbox'

/**
 * Multi-select — a popover with a checkbox list.
 *
 * Same `options` / `optionLabel` / `optionValue` contract as `Select`;
 * the model is an array of option values.
 */
const props = defineProps<{
  options: readonly T[]
  optionLabel?: string
  optionValue?: string
  placeholder?: string
  disabled?: boolean
  id?: string
}>()

const modelValue = defineModel<(string | number)[]>({ default: () => [] })

interface NormalizedOption {
  label: string
  value: string | number
}

const normalized = computed<NormalizedOption[]>(() =>
  props.options.map((option) => {
    const record = option as Record<string, unknown>
    return {
      label: String(record[props.optionLabel ?? 'label']),
      value: record[props.optionValue ?? 'value'] as string | number,
    }
  }),
)

const summary = computed(() => {
  const selected = normalized.value.filter(o => modelValue.value.includes(o.value))
  return selected.length ? selected.map(o => o.label).join(', ') : ''
})

function toggle(value: string | number, checked: boolean) {
  const next = new Set(modelValue.value)
  if (checked) next.add(value)
  else next.delete(value)
  modelValue.value = [...next]
}
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger
      :id="props.id"
      :disabled="props.disabled"
      :class="cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        $attrs.class as string,
      )"
    >
      <span :class="cn('truncate text-left', !summary && 'text-muted-foreground')">
        {{ summary || props.placeholder || 'Select…' }}
      </span>
      <ChevronDown class="size-4 shrink-0 opacity-50" aria-hidden="true" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        align="start"
        :side-offset="4"
        class="z-50 max-h-72 w-[var(--reka-popover-trigger-width)] min-w-48 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
      >
        <p v-if="normalized.length === 0" class="px-2 py-1.5 text-sm text-muted-foreground">
          No options
        </p>
        <label
          v-for="option in normalized"
          :key="String(option.value)"
          class="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          <Checkbox
            :model-value="modelValue.includes(option.value)"
            @update:model-value="(checked: boolean) => toggle(option.value, checked)"
          />
          <span class="truncate">{{ option.label }}</span>
        </label>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
