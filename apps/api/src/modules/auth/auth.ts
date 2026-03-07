import type { BetterAuthPlugin } from 'better-auth'
import { apiKey } from '@better-auth/api-key'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, bearer, genericOAuth, jwt, openAPI, organization, twoFactor } from 'better-auth/plugins'
import { keycloak } from 'better-auth/plugins/generic-oauth'
import { db } from '~/prisma/clients.js'
import { config } from '~/utils/config.js'
import { ac, adminRole, memberRole, ownerRole } from './access-control.js'
import { mapKeycloakProfileToUser } from './keycloak.js'
import { buildSecondaryStorage } from './redis.js'

// ---------------------------------------------------------------------------
// BetterAuth — authentication & authorization
//
// This module handles authentication (sessions, passwords, OIDC, 2FA) and
// organisation-level access control via the BetterAuth organization plugin.
// Roles and permissions are managed through `access-control.ts`.
// Redis secondary storage is built in redis.ts (testable in isolation).
// Keycloak OIDC profile mapping is in keycloak.ts (testable in isolation).
// ---------------------------------------------------------------------------

/**
 * Build optional Keycloak OAuth plugin when enabled.
 *
 * Profile-to-user mapping (realm roles, group memberships) is handled
 * by `mapKeycloakProfileToUser` in keycloak.ts.
 */
function buildKeycloakPlugin() {
  if (!config.keycloak.enabled || !config.keycloak.clientId || !config.keycloak.clientSecret || !config.keycloak.issuer) {
    return undefined
  }

  return genericOAuth({
    config: [
      {
        ...keycloak({
          clientId: config.keycloak.clientId,
          clientSecret: config.keycloak.clientSecret,
          issuer: config.keycloak.issuer,
        }),

        mapProfileToUser: (profile: Record<string, unknown>) =>
          mapKeycloakProfileToUser(profile, {
            mapRoles: config.keycloak.mapRoles,
            mapGroups: config.keycloak.mapGroups,
          }),
      },
    ],
  })
}

/**
 * BetterAuth instance — the single source of truth for authentication.
 *
 * Plugins:
 *  - bearer       — API access via Authorization header
 *  - admin        — user management & impersonation
 *  - twoFactor    — TOTP / OTP 2FA
 *  - openAPI      — auto-generated OpenAPI reference (Scalar UI)
 *  - jwt          — JWT + JWKS endpoints for stateless verification
 *  - organization — org management, members, invitations, access control
 *  - apiKey       — API key lifecycle, rate limiting, org-owned keys
 *  - keycloak     — optional OIDC federation
 */

const keycloakPlugin = buildKeycloakPlugin()

export const auth = betterAuth({
  basePath: `${apiPrefix.v1}/auth`,
  secret: config.auth.secret,
  baseURL: config.auth.baseUrl,
  trustedOrigins: config.auth.trustedOrigins,
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  secondaryStorage: buildSecondaryStorage(config.auth),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute cookie cache for stateless validation
    },
  },
  user: {
    additionalFields: {
      firstname: {
        type: 'string',
        required: false,
        defaultValue: '',
        input: true,
      },
      lastname: {
        type: 'string',
        required: false,
        defaultValue: '',
        input: true,
      },
      bio: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },
  plugins: [
    bearer(),
    admin({
      defaultRole: 'user',
    }),
    twoFactor({
      issuer: 'template-monorepo-ts',
    }),
    openAPI(),
    jwt(),
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: 'owner',
      // Type assertions — createAccessControl returns branded generics from
      // better-auth/plugins/access that TypeScript cannot portably name in
      // declaration output (Bun resolver paths).
      ac: ac as any,
      roles: { owner: ownerRole, admin: adminRole, member: memberRole } as any,
    }),
    // Type assertion — @better-auth/api-key $ERROR_CODES type mismatch with core
    apiKey() as unknown as BetterAuthPlugin,
    ...(keycloakPlugin ? [keycloakPlugin] : []),
  ],
})

export type Auth = typeof auth
export type Session = typeof auth.$Infer.Session
