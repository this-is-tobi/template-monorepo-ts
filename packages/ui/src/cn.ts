import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class values with Tailwind-aware conflict resolution.
 *
 * The canonical `cn()` helper from the shadcn ecosystem: `clsx` handles
 * conditional/array inputs, `tailwind-merge` deduplicates conflicting
 * utilities so callers can override component defaults (`cn('p-2', 'p-4')`
 * → `'p-4'`).
 *
 * Every vendored UI primitive in `apps/web/src/components/ui` builds its
 * class lists through this helper.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
