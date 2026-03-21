import type { AuthenticatedClientConfig } from '@template-monorepo-ts/shared'
import { createAuthenticatedClient } from '@template-monorepo-ts/shared'

export { createAuthenticatedClient }

/**
 * Create an API client from resolved MCP configuration.
 * Delegates to the shared `createAuthenticatedClient` factory.
 */
export function createClient(config: AuthenticatedClientConfig) {
  return createAuthenticatedClient(config)
}
