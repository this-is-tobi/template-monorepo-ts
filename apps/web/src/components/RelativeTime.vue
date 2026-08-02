<script setup lang="ts">
import type { DateInput } from '~/lib/format'
import { computed } from 'vue'
import { formatDateTime, formatRelative } from '~/lib/format'

/**
 * Timestamp rendered as human-relative text ("3 days ago") with the exact
 * value kept in the native tooltip and in `<time datetime>` — scannable at a
 * glance, precise when it matters.
 */
const props = withDefaults(defineProps<{
  value: DateInput
  /** Shown when `value` is missing or unparseable. */
  placeholder?: string
}>(), {
  placeholder: '—',
})

const relative = computed(() => formatRelative(props.value, props.placeholder))
const absolute = computed(() => formatDateTime(props.value, props.placeholder))
const iso = computed(() => {
  if (!props.value) return undefined
  const date = props.value instanceof Date ? props.value : new Date(props.value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
})
</script>

<template>
  <time :datetime="iso" :title="absolute">{{ relative }}</time>
</template>
