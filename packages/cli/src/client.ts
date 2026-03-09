import type { ResolvedConfig } from './types.js'
import { createAuthenticatedClient } from '@template-monorepo-ts/shared'

/**
 * Create an API client from resolved CLI configuration.
 * Delegates to the shared `createAuthenticatedClient` factory.
 */
export function createClient(config: ResolvedConfig) {
  return createAuthenticatedClient(config)
}
