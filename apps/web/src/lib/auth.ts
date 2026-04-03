import { apiKeyClient } from '@better-auth/api-key/client'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { adminClient, genericOAuthClient, organizationClient, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'
import { config } from '~/lib/config'

/** Singleton BetterAuth client — use this for all auth operations in the web app. */
export const authClient = createAuthClient({
  baseURL: `${config.apiUrl || window.location.origin}${apiPrefix.v1}/auth`,
  plugins: [
    organizationClient(),
    twoFactorClient(),
    adminClient(),
    genericOAuthClient(),
    apiKeyClient(),
  ],
})
