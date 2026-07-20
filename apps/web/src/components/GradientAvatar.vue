<script setup lang="ts">
import { computed } from 'vue'

/**
 * Deterministic gradient avatar (GitHub-style identicon feel) — hashes the
 * seed into a hue pair so every user gets a stable, unique gradient with
 * no image dependency. Shows the first letter of `label` on top.
 */
const props = withDefaults(defineProps<{
  /** Stable identifier to derive the gradient from (user id or email). */
  seed: string
  /** Text whose first letter is displayed (falls back to seed). */
  label?: string
  /** Diameter in pixels. */
  size?: number
}>(), { size: 32 })

/** FNV-1a — tiny, stable string hash. */
function hash(str: string): number {
  let h = 0x811C9DC5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const gradient = computed(() => {
  const h = hash(props.seed)
  const hue1 = h % 360
  const hue2 = (hue1 + 40 + (h >> 8) % 80) % 360
  return `linear-gradient(135deg, hsl(${hue1} 65% 52%), hsl(${hue2} 70% 42%))`
})

const initial = computed(() => (props.label || props.seed).charAt(0).toUpperCase())
</script>

<template>
  <span
    class="inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.round(size * 0.42)}px`,
      background: gradient,
    }"
    aria-hidden="true"
  >
    {{ initial }}
  </span>
</template>
