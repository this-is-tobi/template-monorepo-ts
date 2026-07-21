<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '~/components/ui/button'

/**
 * Offset-based pagination bar speaking the same `{ first, rows }` contract
 * as `DataTable` — page numbers are derived, the event carries offsets.
 */
const props = defineProps<{
  first: number
  rows: number
  total: number
}>()

const emit = defineEmits<{
  page: [event: { first: number, rows: number }]
}>()

const page = computed(() => Math.floor(props.first / props.rows) + 1)
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.rows)))

const rangeLabel = computed(() => {
  if (props.total === 0) return '0 of 0'
  const start = props.first + 1
  const end = Math.min(props.first + props.rows, props.total)
  return `${start}–${end} of ${props.total}`
})

/** Compact page list: first, last, current ±1, with ellipsis gaps. */
const pages = computed<(number | 'ellipsis')[]>(() => {
  const count = pageCount.value
  const current = page.value
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const wanted = new Set([1, 2, current - 1, current, current + 1, count - 1, count])
  const list: (number | 'ellipsis')[] = []
  for (let p = 1; p <= count; p++) {
    if (wanted.has(p)) {
      list.push(p)
    } else if (list.at(-1) !== 'ellipsis') {
      list.push('ellipsis')
    }
  }
  return list
})

function goTo(target: number) {
  const clamped = Math.min(Math.max(1, target), pageCount.value)
  if (clamped === page.value) return
  emit('page', { first: (clamped - 1) * props.rows, rows: props.rows })
}
</script>

<template>
  <nav class="flex items-center justify-between gap-4" aria-label="Pagination">
    <span class="text-sm text-muted-foreground">{{ rangeLabel }}</span>
    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="goTo(page - 1)"
      >
        <ChevronLeft class="size-4" />
      </Button>
      <template v-for="(item, i) in pages" :key="`${item}-${i}`">
        <span v-if="item === 'ellipsis'" class="px-1.5 text-sm text-muted-foreground">…</span>
        <Button
          v-else
          :variant="item === page ? 'outline' : 'ghost'"
          size="icon"
          class="text-sm"
          :aria-current="item === page ? 'page' : undefined"
          @click="goTo(item)"
        >
          {{ item }}
        </Button>
      </template>
      <Button
        variant="ghost"
        size="icon"
        :disabled="page >= pageCount"
        aria-label="Next page"
        @click="goTo(page + 1)"
      >
        <ChevronRight class="size-4" />
      </Button>
    </div>
  </nav>
</template>
