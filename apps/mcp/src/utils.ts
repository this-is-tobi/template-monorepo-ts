import { formatApiError } from '@template-monorepo-ts/shared'

export { formatApiError }

/**
 * Format a successful API response as an MCP tool result.
 */
export function formatSuccess(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  }
}

/**
 * Format an error as an MCP tool result with `isError: true`.
 * Delegates error-message extraction to the shared `formatApiError` helper.
 */
export function formatError(error: unknown) {
  return {
    content: [{ type: 'text' as const, text: formatApiError(error) }],
    isError: true as const,
  }
}
