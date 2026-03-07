import type { OutputFormat } from './types.js'

/**
 * ANSI color codes for table headers
 */
const BOLD = '\x1B[1m'
const RESET = '\x1B[0m'
const DIM = '\x1B[2m'

/**
 * Format a single value for display in table cells.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Format data as an aligned table with column headers.
 * Automatically sizes columns based on content width.
 */
export function formatTable(data: Record<string, unknown>[]): string {
  if (data.length === 0) return 'No results.'

  const keys = Object.keys(data[0])
  const headers = keys.map(k => k.toUpperCase())

  // Calculate column widths
  const widths = keys.map((key, i) => {
    const headerLen = headers[i].length
    const maxDataLen = data.reduce((max, row) => Math.max(max, formatValue(row[key]).length), 0)
    return Math.max(headerLen, maxDataLen)
  })

  // Build header row
  const headerRow = headers.map((h, i) => `${BOLD}${h.padEnd(widths[i])}${RESET}`).join('  ')
  const separator = widths.map(w => `${DIM}${'-'.repeat(w)}${RESET}`).join('  ')

  // Build data rows
  const rows = data.map(row =>
    keys.map((key, i) => formatValue(row[key]).padEnd(widths[i])).join('  '),
  )

  return [headerRow, separator, ...rows].join('\n')
}

/**
 * Format data as indented JSON.
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Format data according to the specified output format.
 */
export function formatOutput(data: unknown, format: OutputFormat): string {
  if (format === 'json') {
    return formatJson(data)
  }

  // Table format: normalize to array of objects
  if (Array.isArray(data)) {
    if (data.length === 0) return 'No results.'
    if (typeof data[0] === 'object' && data[0] !== null) {
      return formatTable(data as Record<string, unknown>[])
    }
    return data.map(String).join('\n')
  }

  if (typeof data === 'object' && data !== null) {
    return formatTable([data as Record<string, unknown>])
  }

  return String(data)
}

/**
 * Format data and print to stdout.
 */
export function printOutput(data: unknown, format: OutputFormat): void {
  process.stdout.write(`${formatOutput(data, format)}\n`)
}
