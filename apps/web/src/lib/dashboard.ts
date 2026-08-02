import type { Component } from 'vue'
import DashboardActivity from '~/components/dashboard/DashboardActivity.vue'
import DashboardExpiringKeys from '~/components/dashboard/DashboardExpiringKeys.vue'
import DashboardInvitations from '~/components/dashboard/DashboardInvitations.vue'
import DashboardOrganizations from '~/components/dashboard/DashboardOrganizations.vue'
import DashboardRecentProjects from '~/components/dashboard/DashboardRecentProjects.vue'
import DashboardStats from '~/components/dashboard/DashboardStats.vue'

/** What a widget can branch on to decide whether it applies to this user. */
export interface WidgetContext {
  isAdmin: boolean
}

export interface DashboardWidget {
  /** Stable key — also the v-for key. */
  id: string
  component: Component
  /**
   * Width on the 2-column desktop grid. Widgets are always full-width on
   * mobile. Defaults to `'full'`.
   */
  span?: 'full' | 'half'
  /**
   * Gate the widget on user capability. Widgets that render nothing when
   * empty (invitations, expiring keys) handle that internally instead.
   */
  visible?: (ctx: WidgetContext) => boolean
}

/**
 * Dashboard composition — the whole page is this list.
 *
 * Each widget owns its own data fetching, so removing one is a single-line
 * delete here (and deleting its component file); nothing else needs to know.
 * Reorder by moving entries. Add your own by appending a component that
 * renders a `<Card>`.
 */
export const dashboardWidgets: DashboardWidget[] = [
  { id: 'invitations', component: DashboardInvitations },
  { id: 'stats', component: DashboardStats },
  { id: 'recent-projects', component: DashboardRecentProjects, span: 'half' },
  { id: 'organizations', component: DashboardOrganizations, span: 'half' },
  // Audit reads require the `audit:read` permission — platform admins here.
  // Drop this entry when running with `MODULES__AUDIT=false`.
  { id: 'activity', component: DashboardActivity, span: 'half', visible: ctx => ctx.isAdmin },
  { id: 'expiring-keys', component: DashboardExpiringKeys, span: 'half' },
]
