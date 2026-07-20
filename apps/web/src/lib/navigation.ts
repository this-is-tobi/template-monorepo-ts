import type { Component } from 'vue'
import {
  BookOpen,
  Building2,
  FolderKanban,
  Folders,
  Home,
  Info,
  KeyRound,
  Palette,
  ScrollText,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-vue-next'

/**
 * Navigation config — single source of truth for the sidebar and the
 * command palette. Add an entry here and it shows up in both.
 */
export interface NavItem {
  /** Visible label (also used for command-palette matching). */
  label: string
  /** Router path. */
  to: string
  /** Lucide icon component. */
  icon: Component
}

/** Primary navigation — visible to every authenticated user. */
export const mainNav: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: Home },
  { label: 'Organizations', to: '/organizations', icon: Building2 },
  { label: 'Projects', to: '/projects', icon: FolderKanban },
  { label: 'API keys', to: '/api-keys', icon: KeyRound },
]

/** Settings navigation — platform admins only. */
export const settingsNav: NavItem[] = [
  { label: 'General', to: '/settings/general', icon: Info },
  { label: 'Configuration', to: '/settings/config', icon: SlidersHorizontal },
  { label: 'Theme', to: '/settings/theme', icon: Palette },
  { label: 'Audit logs', to: '/settings/audit', icon: ScrollText },
]

/** Administration navigation — platform admins only. */
export const adminNav: NavItem[] = [
  { label: 'All projects', to: '/settings/admin/projects', icon: Folders },
  { label: 'All organizations', to: '/settings/admin/organizations', icon: Building2 },
  { label: 'All API keys', to: '/settings/admin/api-keys', icon: KeyRound },
  { label: 'All users', to: '/settings/admin/users', icon: Users },
]

/** Icon reused by sidebar + palette for the settings entry point. */
export const settingsIcon = Settings
export const documentationIcon = BookOpen
