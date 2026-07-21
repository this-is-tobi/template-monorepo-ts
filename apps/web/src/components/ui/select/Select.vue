<script setup lang="ts" generic="T extends Record<string, any> | string | number">
import { cn } from '@template-monorepo-ts/ui'
import { Check, ChevronDown } from 'lucide-vue-next'
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { computed } from 'vue'

/**
 * Options-driven select — a composed convenience over the Reka UI parts.
 *
 * Mirrors the common `options` / `optionLabel` / `optionValue` pattern:
 * pass raw objects plus the keys to read, or plain strings/numbers.
 */
const props = defineProps<{
  options: readonly T[]
  optionLabel?: string
  optionValue?: string
  placeholder?: string
  disabled?: boolean
  id?: string
}>()

const modelValue = defineModel<string | number | null>()

interface NormalizedOption {
  label: string
  value: string | number
}

const normalized = computed<NormalizedOption[]>(() =>
  props.options.map((option) => {
    if (typeof option === 'string' || typeof option === 'number') {
      return { label: String(option), value: option }
    }
    const record = option as Record<string, unknown>
    return {
      label: String(record[props.optionLabel ?? 'label']),
      value: record[props.optionValue ?? 'value'] as string | number,
    }
  }),
)

// Reka's Select works with string values; keep a string↔value mapping so
// numeric option values round-trip correctly.
const stringValue = computed({
  get: () => modelValue.value == null ? undefined : String(modelValue.value),
  set: (raw: string | undefined) => {
    const match = normalized.value.find(o => String(o.value) === raw)
    modelValue.value = match ? match.value : null
  },
})

const selectedLabel = computed(() =>
  normalized.value.find(o => String(o.value) === stringValue.value)?.label,
)
</script>

<template>
  <SelectRoot v-model="stringValue" :disabled="props.disabled">
    <SelectTrigger
      :id="props.id"
      :class="cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground',
        $attrs.class as string,
      )"
    >
      <SelectValue :placeholder="props.placeholder">
        {{ selectedLabel }}
      </SelectValue>
      <ChevronDown class="size-4 opacity-50" aria-hidden="true" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="4"
        class="z-50 max-h-72 min-w-32 w-[var(--reka-select-trigger-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
      >
        <SelectViewport class="p-1">
          <SelectItem
            v-for="option in normalized"
            :key="String(option.value)"
            :value="String(option.value)"
            class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
          >
            <SelectItemText>{{ option.label }}</SelectItemText>
            <SelectItemIndicator class="absolute right-2 flex size-4 items-center justify-center">
              <Check class="size-4" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
