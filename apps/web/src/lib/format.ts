/**
 * Shared display formatters.
 *
 * Centralised so dates read the same everywhere — page-local `formatDate`
 * helpers drifted between `toLocaleDateString` and `toLocaleString`, which is
 * why the same column rendered differently across pages.
 *
 * All helpers are null-safe and return `placeholder` (default `'—'`) for
 * missing or unparseable input, so templates never need a `v-if` guard.
 */

export type DateInput = string | number | Date | null | undefined

/**
 * Locale used by every formatter here.
 *
 * Follows `<html lang>` rather than the browser's preferred language: the UI
 * copy is authored in one language, and taking the browser locale produced
 * sentences like "expires dans 3 jours" — English label, French date. When
 * the app gains i18n, update `lang` and the dates follow automatically.
 */
function locale(): string {
  if (typeof document === 'undefined') return 'en'
  return document.documentElement.lang || 'en'
}

/** Parse anything date-ish into a valid Date, or null. */
function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Date only — e.g. `2 Aug 2026`. Use in tables where time adds no signal. */
export function formatDate(value: DateInput, placeholder = '—'): string {
  const date = toDate(value)
  if (!date) return placeholder
  return date.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Date + time — e.g. `2 Aug 2026, 14:32`. Use for audit trails and sessions. */
export function formatDateTime(value: DateInput, placeholder = '—'): string {
  const date = toDate(value)
  if (!date) return placeholder
  return date.toLocaleString(locale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

/**
 * Human relative time — e.g. `3 days ago`, `in 2 hours`, `just now`.
 *
 * Pair with an absolute value in a `title` attribute so hovering still gives
 * the exact timestamp (see the `RelativeTime` component).
 */
export function formatRelative(value: DateInput, placeholder = '—', now: number = Date.now()): string {
  const date = toDate(value)
  if (!date) return placeholder

  const diff = date.getTime() - now
  const abs = Math.abs(diff)

  // Below a minute the exact count is noise — everything is "just now".
  if (abs < 60 * 1000) return 'just now'

  const formatter = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' })
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs >= ms) return formatter.format(Math.round(diff / ms), unit)
  }
  return 'just now'
}

/**
 * Whether a date is in the past. Missing dates are not expired — callers use
 * this for "expires at" fields where `null` means "never expires".
 */
export function isPast(value: DateInput, now: number = Date.now()): boolean {
  const date = toDate(value)
  return date ? date.getTime() < now : false
}

/** Whether a date falls within the next `days` (and hasn't already passed). */
export function isWithinDays(value: DateInput, days: number, now: number = Date.now()): boolean {
  const date = toDate(value)
  if (!date) return false
  const time = date.getTime()
  return time >= now && time < now + days * 24 * 60 * 60 * 1000
}

/**
 * Shorten an opaque identifier for display — `a1b2c3d4…9f8e`.
 * Full value belongs in a `title`/copy affordance, not the visible cell.
 */
export function truncateId(id: string | null | undefined, head = 8, tail = 4): string {
  if (!id) return '—'
  if (id.length <= head + tail + 1) return id
  return `${id.slice(0, head)}…${id.slice(-tail)}`
}
