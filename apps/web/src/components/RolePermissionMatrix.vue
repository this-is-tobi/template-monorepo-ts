<script setup lang="ts">
import type { RoleDefinition } from '@template-monorepo-ts/shared'
import { describePermission, ORGANIZATION_ROLES, PERMISSION_MATRIX, PROJECT_ROLES } from '@template-monorepo-ts/shared'
import { Check, Minus } from 'lucide-vue-next'
import { computed } from 'vue'

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
  /** Drop the summary row when space is tight. */
  hideSummaries?: boolean
  /** Drop the per-permission sentences, leaving just the identifiers. */
  hideDescriptions?: boolean
}>(), {
  scope: 'project',
  highlight: null,
  hideSummaries: false,
  hideDescriptions: false,
})

const roles = computed<Record<string, RoleDefinition>>(() =>
  props.scope === 'organization' ? ORGANIZATION_ROLES : PROJECT_ROLES,
)

const roleNames = computed(() => Object.keys(roles.value))

/**
 * Only resources some role in this family touches.
 *
 * The project table would otherwise carry a row for every organization
 * resource, all of them empty — noise that buries the five rows that matter.
 */
const rows = computed(() => {
  const touched = new Set(
    Object.values(roles.value).flatMap(role => Object.keys(role.permissions)),
  )
  return Object.entries(PERMISSION_MATRIX)
    .filter(([resource]) => touched.has(resource))
    .flatMap(([resource, actions]) =>
      actions.map((action, index) => ({
        resource,
        action,
        /** Only the first row of a resource repeats its name. */
        firstOfResource: index === 0,
        span: actions.length,
      })),
    )
})

/** Whether rows need a `resource:` prefix at all. */
const multiResource = computed(() => new Set(rows.value.map(r => r.resource)).size > 1)

/** Does this role grant this resource:action? */
function grants(role: string, resource: string, action: string): boolean {
  return roles.value[role]?.permissions[resource]?.includes(action) ?? false
}

function isHighlighted(role: string): boolean {
  return props.highlight === role
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="border-b border-[var(--app-border)]">
          <th class="text-left font-medium py-2 pr-3 text-[var(--app-muted)]">
            Permission
          </th>
          <th
            v-for="role in roleNames"
            :key="role"
            class="px-3 py-2 font-medium capitalize text-center whitespace-nowrap"
            :class="isHighlighted(role) ? 'text-[var(--app-primary)]' : ''"
            :aria-current="isHighlighted(role) ? 'true' : undefined"
          >
            {{ role }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="row in rows"
          :key="`${row.resource}:${row.action}`"
          class="border-b border-[var(--app-border)] last:border-0"
        >
          <th
            scope="row"
            class="text-left font-normal py-1.5 pr-3 align-top"
          >
            <div class="whitespace-nowrap">
              <span
                v-if="multiResource"
                :class="row.firstOfResource ? 'text-[var(--app-muted)]' : 'text-transparent select-none'"
              >{{ row.resource }}:</span>
              <span class="font-mono">{{ row.action }}</span>
            </div>
            <!-- The identifier alone asks the reader to already know what
                 `manage-members` covers; the sentence is the whole point. -->
            <div
              v-if="!hideDescriptions && describePermission(row.resource, row.action)"
              class="text-xs text-[var(--app-muted)] font-normal max-w-[22rem] whitespace-normal"
            >
              {{ describePermission(row.resource, row.action) }}
            </div>
          </th>
          <td
            v-for="role in roleNames"
            :key="role"
            class="px-3 py-1.5 text-center"
            :class="isHighlighted(role) ? 'bg-[var(--app-primary)]/8' : ''"
          >
            <Check
              v-if="grants(role, row.resource, row.action)"
              class="w-4 h-4 mx-auto text-[var(--app-primary)]"
              :aria-label="`${role} can ${row.action} ${row.resource}`"
            />
            <Minus
              v-else
              class="w-3 h-3 mx-auto text-[var(--app-muted)] opacity-40"
              :aria-label="`${role} cannot ${row.action} ${row.resource}`"
            />
          </td>
        </tr>
      </tbody>

      <tfoot v-if="!hideSummaries">
        <tr>
          <td class="pt-3 pr-3 align-top text-[var(--app-muted)]">
            Summary
          </td>
          <td
            v-for="role in roleNames"
            :key="role"
            class="px-3 pt-3 align-top text-xs text-[var(--app-muted)] min-w-[9rem]"
            :class="isHighlighted(role) ? 'text-[var(--app-fg)]' : ''"
          >
            {{ roles[role]?.summary }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
