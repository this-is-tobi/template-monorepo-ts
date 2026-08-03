import type { Component } from 'vue'
import { Building2, Crown, Eye, FolderKanban, KeyRound, Mail, ScrollText, ShieldCheck, User, Users } from 'lucide-vue-next'

/**
 * One visual language for roles and resources.
 *
 * Roles are the part of this app people get wrong, and colour is the fastest
 * cue there is — but only when it means the same thing everywhere. The badge
 * on a member row, the highlighted column in the permission matrix and the
 * "your access" card all read from here, so an owner is never destructive-red
 * in one place and blue in the next.
 */

/** Badge colour for a membership role, strongest first. */
export function roleBadgeVariant(role: string | null | undefined): 'destructive' | 'warning' | 'info' | 'secondary' {
  if (role === 'owner') return 'destructive'
  if (role === 'admin') return 'warning'
  if (!role) return 'secondary'
  return 'info'
}

const ROLE_ICONS: Record<string, Component> = {
  owner: Crown,
  admin: ShieldCheck,
  member: User,
  viewer: Eye,
}

/**
 * Icon for a membership role.
 *
 * Falls back to the generic person for custom roles, which an organization can
 * define at will — the shape is a hint, never the only cue, so an unrecognised
 * role degrades to "somebody with a role" rather than to nothing.
 */
export function roleIcon(role: string | null | undefined): Component {
  return ROLE_ICONS[role ?? ''] ?? User
}

const RESOURCE_ICONS: Record<string, Component> = {
  organization: Building2,
  member: Users,
  invitation: Mail,
  ac: ShieldCheck,
  project: FolderKanban,
  'service-key': KeyRound,
  audit: ScrollText,
}

/** Icon for a permission resource, for grouping rows under a heading. */
export function resourceIcon(resource: string): Component {
  return RESOURCE_ICONS[resource] ?? FolderKanban
}
