import type { ResolvedConfig } from './types.js'
import { ApiClient } from '@template-monorepo-ts/shared'

/**
 * Create an API client from resolved CLI configuration.
 * Applies bearer token or API key authentication headers.
 */
export function createClient(config: ResolvedConfig): ApiClient {
  const headers: Record<string, string> = {}

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`
  } else if (config.apiKey) {
    headers['x-api-key'] = config.apiKey
  }

  return new ApiClient({
    baseUrl: config.serverUrl,
    baseHeaders: headers,
  })
}
