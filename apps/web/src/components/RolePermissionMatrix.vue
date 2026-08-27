<script setup lang="ts">
import type { RoleDefinition } from '@template-monorepo-ts/shared'
import { describeResource, ORGANIZATION_ROLES, PERMISSION_MATRIX, PROJECT_ROLES } from '@template-monorepo-ts/shared'
import { Check, Minus } from 'lucide-vue-next'
import { computed } from 'vue'
import PermissionHint from '~/components/PermissionHint.vue'
import { resourceIcon, roleIcon } from '~/lib/roles'

/**
 * What each built-in role can actually do, side by side.
 *
 * Roles are the part of this app people get wrong, and a bare dropdown of
 * "admin / member / viewer" asks them to guess. Showing the alternatives
 * together — rather than only describing the one already chosen — is what
 * makes the choice legible: you can see that `member` stops exactly one column
 * short of managing the roster.
 *
 * The tables come from `@template-monorepo-ts/shared`, the same ones the API
 * builds its BetterAuth roles from, so this cannot promise access the server
 * will refuse. A spec in `access-control.spec.ts` holds the two together.
 */
const props = withDefaults(defineProps<{
  /** Which role family to show. */
  scope?: 'project' | 'organization'
  /** Emphasise one role's column — typically the one being assigned. */
  highlight?: string | null
  /** Label the highlighted column as the reader's own role. */
  highlightIsYou?: boolean
  /** Drop the summary line under each role when space is tight. */
  hideSummaries?: boolean
  /**
   * Roles defined at runtime, shown as columns after the built-in ones.
   *
   * A custom role is only meaningful next to what it adds to: listing it apart
   * from the table, as a count of permissions, says how *many* without saying
   * which — and "5 permissions" is not something anyone can review.
   */
  extraRoles?: Record<string, RoleDefinition>
}>(), {
  scope: 'project',
  highlight: null,
  highlightIsYou: false,
  hideSummaries: false,
  extraRoles: undefined,
})

const roles = computed<Record<string, RoleDefinition>>(() => ({
  ...(props.scope === 'organization' ? ORGANIZATION_ROLES : PROJECT_ROLES),
  ...props.extraRoles,
}))

const roleNames = computed(() => Object.keys(roles.value))

/**
 * Rows grouped by resource, keeping only what some role in this family grants.
 *
 * Two kinds of noise get filtered. Resources nobody here touches would add a
 * block of empty rows — the project table has no business listing invitations.
 * And actions nobody grants are worse than empty: `project:create` is an
 * organization-level action, so it rendered as a full row of dashes that
 * looked like a bug in the table rather than a fact about the roles.
 */
const groups = computed(() => {
  return Object.entries(PERMISSION_MATRIX)
    .map(([resource, actions]) => ({
      resource,
      label: describeResource(resource),
      icon: resourceIcon(resource),
      actions: actions.filter(action =>
        roleNames.value.some(role => grants(role, resource, action)),
      ),
    }))
    .filter(group => group.actions.length > 0)
})

/** Total grantable permissions, for the "3 of 7" counts in the header. */
const total = computed(() => groups.value.reduce((sum, group) => sum + group.actions.length, 0))

/** How many of them each role holds. */
function grantedCount(role: string): number {
  return groups.value.reduce(
    (sum, group) => sum + group.actions.filter(action => grants(role, group.resource, action)).length,
    0,
  )
}

/** Does this role grant this resource:action? */
function grants(role: string, resource: string, action: string): boolean {
  return roles.value[role]?.permissions[resource]?.includes(action) ?? false
}

function isHighlighted(role: string): boolean {
  return props.highlight === role
}

/**
 * Roles that grant exactly the same thing.
 *
 * Project `owner` and `admin` currently do, and two identical columns with no
 * explanation read as a mistake in the table. Computed rather than written
 * down, so the note disappears by itself if the tables ever diverge.
 */
const identicalRoles = computed(() => {
  const fingerprint = (role: string) =>
    groups.value
      .flatMap(group => group.actions.map(action => (grants(role, group.resource, action) ? '1' : '0')))
      .join('')

  const seen = new Map<string, string[]>()
  for (const role of roleNames.value) {
    const key = fingerprint(role)
    seen.set(key, [...(seen.get(key) ?? []), role])
  }
  return [...seen.values()].filter(group => group.length > 1)
})

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Sticky first column, so the permission a row is about stays readable while
 * the roles scroll under a narrow viewport — checkmarks with no visible label
 * are worse than a table you cannot see all of.
 *
 * It has to sit on an opaque background to scroll over one, and the component
 * is dropped on both a card and a dialog, which do not share a colour. Hence
 * the override: `--matrix-surface` where it differs, the card colour by
 * default.
 */
const STICKY_CELL = 'sticky left-0 z-10 bg-[var(--matrix-surface,var(--app-surface))]'
</script>

<template>
  <!-- `min-w-0` twice over: as a flex or grid item this defaults to
       `min-width: auto`, which sizes to the widest cell and lets the table
       burst straight out of a dialog instead of scrolling inside it. -->
  <div class="flex flex-col gap-3 min-w-0">
    <div class="overflow-x-auto min-w-0">
      <table class="w-full text-sm border-collapse">
        <caption class="sr-only">
          Permissions granted by each {{ scope }} role. Rows are permissions, columns are roles.
        </caption>

        <thead>
          <!-- Everything about a role sits in its column head: name, how much
               it grants, and the sentence. The summary used to live in a
               footer, which meant reading the name at the top and hunting for
               its meaning eight rows below. -->
          <!-- Top-aligned: the role names line up across columns however many
               lines each summary runs to. -->
          <tr class="border-b border-[var(--app-border)] align-top">
            <th class="text-left font-medium py-2 pr-4 text-[var(--app-muted)]" :class="STICKY_CELL">
              Permission
            </th>
            <!-- Emphasis is the tinted band and the chip, never a colour swap:
                 `--primary` is darker than the text in one theme and lighter in
                 the other, so tinting the highlighted label made the one column
                 that matters most the hardest to read in dark mode. -->
            <th
              v-for="role in roleNames"
              :key="role"
              scope="col"
              class="px-3 py-2 text-center min-w-[8.5rem] rounded-t-md"
              :class="isHighlighted(role) ? 'bg-[var(--app-primary)]/10 font-semibold' : 'font-medium'"
              :aria-current="isHighlighted(role) ? 'true' : undefined"
            >
              <div class="flex flex-col items-center gap-1">
                <component
                  :is="roleIcon(role)"
                  class="w-4 h-4"
                  :class="isHighlighted(role) ? 'text-[var(--app-fg)]' : 'text-[var(--app-muted)]'"
                  aria-hidden="true"
                />
                <span class="whitespace-nowrap">{{ capitalize(role) }}</span>
                <span
                  v-if="highlightIsYou && isHighlighted(role)"
                  class="rounded-full bg-[var(--app-primary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-primary-fg)]"
                >You</span>
                <span class="text-xs font-normal text-[var(--app-muted)] whitespace-nowrap">
                  {{ grantedCount(role) }} of {{ total }}
                </span>
                <span
                  v-if="!hideSummaries"
                  class="text-xs font-normal text-[var(--app-muted)] whitespace-normal max-w-[11rem]"
                >{{ roles[role]?.summary }}</span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody v-for="group in groups" :key="group.resource">
          <!-- A labelled band per resource. The rows used to be prefixed with
               a transparent copy of the resource name, which grouped them for
               nobody: it just left the actions floating in ragged indent. -->
          <!-- `rowgroup` scope, not a cell spanning the width: the label heads
               the tbody that follows, and leaving the role cells in place lets
               the highlighted column run unbroken through the band. -->
          <tr class="border-y border-[var(--app-border)]">
            <th
              scope="rowgroup"
              class="text-left py-2 pr-4"
              :class="STICKY_CELL"
            >
              <span class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                <component :is="group.icon" class="w-3.5 h-3.5" aria-hidden="true" />
                {{ group.label }}
              </span>
            </th>
            <td
              v-for="role in roleNames"
              :key="role"
              :class="isHighlighted(role) ? 'bg-[var(--app-primary)]/10' : ''"
            />
          </tr>

          <tr
            v-for="action in group.actions"
            :key="`${group.resource}:${action}`"
            class="border-b border-[var(--app-border)] last:border-0"
          >
            <th
              scope="row"
              class="text-left font-normal py-1.5 pr-4 align-top"
              :class="STICKY_CELL"
            >
              <span class="inline-flex items-center gap-1.5">
                <span class="font-mono text-[var(--app-fg)]">{{ action }}</span>
                <!-- `manage-members` tells a reader nothing on its own, and the
                     person reading it is the one about to grant it. The wording
                     lives behind the hint in every context rather than inline
                     here and behind an icon there: one mechanism to keep right,
                     and the grid stays one line per row wherever it appears. -->
                <PermissionHint :resource="group.resource" :action="action" />
              </span>
            </th>
            <td
              v-for="role in roleNames"
              :key="role"
              class="px-3 py-1.5 text-center"
              :class="isHighlighted(role) ? 'bg-[var(--app-primary)]/10' : ''"
            >
              <!-- The app's success colour, the one the alerts and badges
                   already use — granted and denied have to differ by more than
                   the shape of a small glyph. -->
              <Check
                v-if="grants(role, group.resource, action)"
                class="w-4 h-4 mx-auto text-emerald-600 dark:text-emerald-400"
                :aria-label="`${role} can ${action} ${group.resource}`"
              />
              <Minus
                v-else
                class="w-3 h-3 mx-auto text-[var(--app-muted)] opacity-40"
                :aria-label="`${role} cannot ${action} ${group.resource}`"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p
      v-for="group in identicalRoles"
      :key="group.join('-')"
      class="text-xs text-[var(--app-muted)]"
    >
      <span class="capitalize">{{ group.slice(0, -1).join(', ') }}</span> and
      <span class="capitalize">{{ group.at(-1) }}</span> grant exactly the same permissions —
      the columns are identical on purpose.
    </p>
  </div>
</template>
