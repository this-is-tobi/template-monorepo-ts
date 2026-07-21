<script setup lang="ts">
import type { VNode } from 'vue'
import { cn } from '@template-monorepo-ts/ui'
import { computed, Fragment, ref, useSlots } from 'vue'
import { Checkbox } from '~/components/ui/checkbox'
import { Skeleton } from '~/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import Column from './Column.vue'
import Pagination from './Pagination.vue'

/**
 * Options-lite data table with the lazy-pagination contract used across the
 * app: `value` + `first`/`rows`/`totalRecords` + a `page` event carrying
 * `{ first, rows }`. Columns are declared as `<Column>` children with
 * optional `#body` scoped slots — see `Column.vue`.
 */
const props = withDefaults(defineProps<{
  value?: readonly any[]
  loading?: boolean
  /** Rows are fetched per page by the caller; disables client-side slicing. */
  lazy?: boolean
  paginator?: boolean
  rows?: number
  totalRecords?: number
  first?: number
  dataKey?: string
  stripedRows?: boolean
  tableStyle?: string
}>(), {
  value: () => [],
  rows: 10,
  first: 0,
  dataKey: 'id',
})

const emit = defineEmits<{
  page: [event: { first: number, rows: number }]
}>()

const selection = defineModel<any[]>('selection')

const slots = useSlots()

interface ResolvedColumn {
  field?: string
  header?: string
  selectionMode?: 'multiple'
  headerStyle?: string | Record<string, string>
  style?: string | Record<string, string>
  body?: (scope: { data: any, index: number }) => unknown
}

/** Flatten fragments (v-for / v-if groups) into a plain vnode list. */
function flatten(nodes: VNode[]): VNode[] {
  return nodes.flatMap(node =>
    node.type === Fragment && Array.isArray(node.children)
      ? flatten(node.children as VNode[])
      : [node],
  )
}

/** Called from the template so columns re-resolve on every render pass. */
function resolveColumns(): ResolvedColumn[] {
  const nodes = flatten(slots.default?.() ?? [])
  return nodes
    .filter(node => node.type === Column)
    .map((node) => {
      const raw = (node.props ?? {}) as Record<string, any>
      const children = (node.children ?? {}) as Record<string, any>
      return {
        field: raw.field,
        header: raw.header,
        selectionMode: raw['selection-mode'] ?? raw.selectionMode,
        headerStyle: raw['header-style'] ?? raw.headerStyle,
        style: raw.style,
        body: typeof children.body === 'function' ? children.body : undefined,
      }
    })
}

// Uncontrolled first-offset fallback for non-lazy pagination.
const internalFirst = ref(props.first)
const effectiveFirst = computed(() => props.lazy ? props.first : internalFirst.value)

const displayedRows = computed(() => {
  if (!props.paginator || props.lazy) return props.value
  return props.value.slice(effectiveFirst.value, effectiveFirst.value + props.rows)
})

const total = computed(() => props.totalRecords ?? props.value.length)

function onPage(event: { first: number, rows: number }) {
  internalFirst.value = event.first
  emit('page', event)
}

// ── Selection ─────────────────────────────────────────────────────────
function rowId(row: any): unknown {
  return row?.[props.dataKey]
}

function isSelected(row: any): boolean {
  return (selection.value ?? []).some(item => rowId(item) === rowId(row))
}

function toggleRow(row: any, checked: boolean) {
  const current = selection.value ?? []
  selection.value = checked
    ? [...current.filter(item => rowId(item) !== rowId(row)), row]
    : current.filter(item => rowId(item) !== rowId(row))
}

const allSelected = computed(() =>
  displayedRows.value.length > 0 && displayedRows.value.every(row => isSelected(row)),
)

function toggleAll(checked: boolean) {
  const current = selection.value ?? []
  if (checked) {
    const missing = displayedRows.value.filter(row => !isSelected(row))
    selection.value = [...current, ...missing]
  } else {
    const pageIds = new Set(displayedRows.value.map(rowId))
    selection.value = current.filter(item => !pageIds.has(rowId(item)))
  }
}

function cellValue(row: any, field?: string): unknown {
  if (!field) return undefined
  return field.split('.').reduce<any>((acc, key) => acc?.[key], row)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="rounded-lg border border-border bg-card">
      <Table :style="props.tableStyle">
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead
              v-for="(col, i) in resolveColumns()"
              :key="col.field ?? col.header ?? i"
              :style="col.headerStyle"
            >
              <Checkbox
                v-if="col.selectionMode === 'multiple'"
                :model-value="allSelected"
                aria-label="Select all rows"
                @update:model-value="toggleAll"
              />
              <template v-else>
                {{ col.header }}
              </template>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <!-- Loading skeleton rows -->
          <template v-if="props.loading && displayedRows.length === 0">
            <TableRow v-for="n in 3" :key="`skeleton-${n}`">
              <TableCell v-for="i in resolveColumns().length" :key="i">
                <Skeleton class="h-4 w-3/4" />
              </TableCell>
            </TableRow>
          </template>
          <!-- Empty state -->
          <TableRow v-else-if="displayedRows.length === 0">
            <TableCell
              :colspan="resolveColumns().length"
              class="py-8 text-center text-muted-foreground"
            >
              <slot name="empty">
                No records found.
              </slot>
            </TableCell>
          </TableRow>
          <!-- Data rows -->
          <TableRow
            v-for="(row, index) in displayedRows"
            v-else
            :key="String(rowId(row) ?? index)"
            :class="cn(props.stripedRows && 'even:bg-muted/30', isSelected(row) && 'bg-muted/50')"
            :data-state="isSelected(row) ? 'selected' : undefined"
          >
            <TableCell
              v-for="(col, i) in resolveColumns()"
              :key="col.field ?? col.header ?? i"
              :style="col.style"
            >
              <Checkbox
                v-if="col.selectionMode === 'multiple'"
                :model-value="isSelected(row)"
                aria-label="Select row"
                @update:model-value="(checked: boolean) => toggleRow(row, checked)"
              />
              <component :is="{ render: () => col.body!({ data: row, index }) }" v-else-if="col.body" />
              <template v-else>
                {{ cellValue(row, col.field) ?? '—' }}
              </template>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <Pagination
      v-if="props.paginator && total > props.rows"
      :first="effectiveFirst"
      :rows="props.rows"
      :total="total"
      @page="onPage"
    />
  </div>
</template>
