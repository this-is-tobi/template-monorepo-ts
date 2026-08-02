import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatRelative, isPast, isWithinDays, truncateId } from './format'

/** Fixed clock so relative assertions never depend on wall time. */
const NOW = new Date('2026-06-15T12:00:00.000Z').getTime()
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('formatDate', () => {
  it('should format a valid date', () => {
    expect(formatDate('2026-06-15T12:00:00.000Z')).toMatch(/2026/)
  })

  it('should accept Date objects and epoch millis', () => {
    expect(formatDate(new Date(NOW))).toMatch(/2026/)
    expect(formatDate(NOW)).toMatch(/2026/)
  })

  it.each([null, undefined, '', 'not-a-date'])('should return the placeholder for %s', (input) => {
    expect(formatDate(input)).toBe('—')
  })

  it('should honour a custom placeholder', () => {
    expect(formatDate(null, 'never')).toBe('never')
  })
})

describe('formatDateTime', () => {
  it('should include a time component', () => {
    // Locale-dependent separators, so assert on the digits rather than exact text.
    expect(formatDateTime('2026-06-15T12:34:00.000Z')).toMatch(/\d{1,2}:\d{2}/)
  })

  it('should return the placeholder for invalid input', () => {
    expect(formatDateTime('nope')).toBe('—')
  })
})

describe('formatRelative', () => {
  it('should collapse sub-minute differences to "just now"', () => {
    expect(formatRelative(new Date(NOW - 30 * 1000), '—', NOW)).toBe('just now')
    expect(formatRelative(new Date(NOW), '—', NOW)).toBe('just now')
  })

  it('should describe past times', () => {
    expect(formatRelative(new Date(NOW - 3 * DAY), '—', NOW)).toContain('3 days ago')
    expect(formatRelative(new Date(NOW - 2 * HOUR), '—', NOW)).toContain('2 hours ago')
  })

  it('should describe future times', () => {
    expect(formatRelative(new Date(NOW + 3 * DAY), '—', NOW)).toContain('in 3 days')
  })

  it('should pick the largest fitting unit', () => {
    expect(formatRelative(new Date(NOW - 400 * DAY), '—', NOW)).toContain('year')
    expect(formatRelative(new Date(NOW - 45 * DAY), '—', NOW)).toContain('month')
  })

  it('should return the placeholder for invalid input', () => {
    expect(formatRelative(null, '—', NOW)).toBe('—')
  })
})

describe('isPast', () => {
  it('should detect past and future dates', () => {
    expect(isPast(new Date(NOW - DAY), NOW)).toBe(true)
    expect(isPast(new Date(NOW + DAY), NOW)).toBe(false)
  })

  it('should treat a missing date as not past — null means "never expires"', () => {
    expect(isPast(null, NOW)).toBe(false)
  })
})

describe('isWithinDays', () => {
  it('should include dates inside the window', () => {
    expect(isWithinDays(new Date(NOW + 3 * DAY), 7, NOW)).toBe(true)
  })

  it('should exclude dates beyond the window', () => {
    expect(isWithinDays(new Date(NOW + 10 * DAY), 7, NOW)).toBe(false)
  })

  it('should exclude dates that already passed', () => {
    expect(isWithinDays(new Date(NOW - DAY), 7, NOW)).toBe(false)
  })

  it('should return false for a missing date', () => {
    expect(isWithinDays(null, 7, NOW)).toBe(false)
  })
})

describe('truncateId', () => {
  it('should shorten long identifiers', () => {
    expect(truncateId('cc001a62-2431-4dac-9527-171896825991')).toBe('cc001a62…5991')
  })

  it('should leave short identifiers untouched', () => {
    expect(truncateId('abc123')).toBe('abc123')
  })

  it('should return the placeholder for empty input', () => {
    expect(truncateId(null)).toBe('—')
  })
})
