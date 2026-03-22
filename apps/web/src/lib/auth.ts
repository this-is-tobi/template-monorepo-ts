import { apiPrefix } from '@template-monorepo-ts/shared'
import { adminClient, genericOAuthClient, organizationClient, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'
import { config } from '~/lib/config'

export const authClient = createAuthClient({
  baseURL: config.apiUrl || window.location.origin,
  basePath: `${apiPrefix.v1}/auth`,
  plugins: [
    organizationClient(),
    twoFactorClient(),
    adminClient(),
    genericOAuthClient(),
  ],
})
