<script setup lang="ts">
/**
 * Render-less column descriptor for `DataTable`.
 *
 * Never renders anything itself — `DataTable` introspects its default slot,
 * collects `Column` vnodes (props + `#body` slot) and renders the table from
 * them. Conditional columns (`v-if`) and ordering work naturally because the
 * parent's slot is re-evaluated on every render.
 */
defineProps<{
  field?: string
  header?: string
  /** 'multiple' renders a checkbox selection column. */
  selectionMode?: 'multiple'
  headerStyle?: string | Record<string, string>
  style?: string | Record<string, string>
}>()

defineSlots<{
  body?: (scope: { data: any, index: number }) => unknown
}>()
</script>

<template>
  <slot v-if="false" name="body" :data="undefined" :index="-1" />
</template>
