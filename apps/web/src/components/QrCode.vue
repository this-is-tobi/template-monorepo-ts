<script setup lang="ts">
import { encode } from 'uqr'
import { computed } from 'vue'

/**
 * QR code rendered as inline SVG rects.
 *
 * Uses `uqr`'s raw matrix rather than its SVG string so the markup stays
 * declarative (no `v-html`) and the modules are addressable in tests.
 * Colours come from `currentColor`, so it inverts correctly in dark mode.
 */
const props = withDefaults(defineProps<{
  /** Payload to encode — for 2FA this is the `otpauth://` URI. */
  value: string
  /** Rendered edge length in pixels. */
  size?: number
  /** Quiet-zone width, in modules. The spec requires at least 4. */
  margin?: number
}>(), {
  size: 176,
  margin: 2,
})

const matrix = computed(() => encode(props.value, { border: props.margin }))

/** Flattened list of dark modules — one <rect> each. */
const modules = computed(() => {
  const cells: { x: number, y: number }[] = []
  matrix.value.data.forEach((row, y) => {
    row.forEach((filled, x) => {
      if (filled) cells.push({ x, y })
    })
  })
  return cells
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${matrix.size} ${matrix.size}`"
    shape-rendering="crispEdges"
    role="img"
    aria-label="QR code for authenticator app enrolment"
    class="rounded-md bg-white p-1 text-black"
  >
    <rect
      v-for="cell in modules"
      :key="`${cell.x}-${cell.y}`"
      :x="cell.x"
      :y="cell.y"
      width="1"
      height="1"
      fill="currentColor"
    />
  </svg>
</template>
