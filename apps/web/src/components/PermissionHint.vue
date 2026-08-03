<script setup lang="ts">
import { describePermission, describeResource, PERMISSION_MATRIX } from '@template-monorepo-ts/shared'
import { cn } from '@template-monorepo-ts/ui'
import { Info } from 'lucide-vue-next'
import { computed } from 'vue'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'

// The root is a renderless popover, so an inherited `class` would land on
// nothing. Route the caller's attributes to the trigger, which is the only
// part of this that occupies space on the page.
defineOptions({ inheritAttrs: false })

/**
 * What a permission actually lets someone do, one click away.
 *
 * The pickers grant access by ticking `resource × action` boxes, which asks the
 * person granting it to already know what `manage-members` or `ac:create`
 * covers — exactly the knowledge someone doing this for the first time does not
 * have. The sentences exist in `shared`; this puts them where the decision is
 * made without turning every picker into a wall of prose.
 *
 * A popover rather than a tooltip, deliberately: it opens on click and on
 * Enter, so it works on a phone and from the keyboard, neither of which hover
 * serves.
 */
const props = defineProps<{
  /** The resource whose actions to describe. */
  resource: string
  /** Describe this action alone; omit to describe every action listed below. */
  action?: string
  /** Which of the resource's actions to cover. Defaults to all of them. */
  actions?: readonly string[]
}>()

const entries = computed(() => {
  const actions = props.action
    ? [props.action]
    : props.actions ?? PERMISSION_MATRIX[props.resource as keyof typeof PERMISSION_MATRIX] ?? []

  return [...actions]
    .map(action => ({ action, description: describePermission(props.resource, action) }))
    .filter((entry): entry is { action: string, description: string } => Boolean(entry.description))
})

const label = computed(() =>
  props.action
    ? `What ${props.resource}:${props.action} allows`
    : `What the ${describeResource(props.resource)} permissions allow`,
)
</script>

<template>
  <Popover v-if="entries.length">
    <PopoverTrigger
      v-bind="$attrs"
      as="button"
      type="button"
      :class="cn(
        'inline-flex items-center justify-center rounded-full text-[var(--app-muted)] transition-colors hover:text-[var(--app-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        $attrs.class as string,
      )"
      :aria-label="label"
    >
      <Info class="w-3.5 h-3.5" />
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80">
      <p class="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)] mb-2">
        {{ describeResource(resource) }}
      </p>
      <dl class="flex flex-col gap-2">
        <div v-for="entry in entries" :key="entry.action" class="flex flex-col">
          <dt class="font-mono text-xs text-[var(--app-fg)]">
            {{ entry.action }}
          </dt>
          <dd class="text-sm text-[var(--app-muted)]">
            {{ entry.description }}
          </dd>
        </div>
      </dl>
    </PopoverContent>
  </Popover>
</template>
