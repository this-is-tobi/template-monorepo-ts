<script setup lang="ts">
/**
 * Full-page loading placeholder — shimmering blocks shaped like a typical
 * detail page (heading, meta line, content card). The visually-hidden
 * "Loading..." keeps the state announced to screen readers.
 */
</script>

<template>
  <div role="status" class="flex flex-col gap-6" aria-live="polite">
    <span class="sr-only">Loading...</span>
    <div class="flex flex-col gap-3">
      <div class="skeleton h-8 w-64" />
      <div class="skeleton h-4 w-40" />
    </div>
    <div class="rounded-[var(--app-radius)] border border-[var(--app-border)] p-6">
      <div class="flex flex-col gap-4">
        <div class="skeleton h-4 w-full max-w-md" />
        <div class="skeleton h-4 w-full max-w-sm" />
        <div class="skeleton h-4 w-full max-w-lg" />
      </div>
    </div>
  </div>
</template>
