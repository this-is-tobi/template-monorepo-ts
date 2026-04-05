import type { OrgMembership } from './keycloak.js'
import type { Prisma } from '~/generated/prisma/client.js'
import { apiKey } from '@better-auth/api-key'
import { createLogger } from '@template-monorepo-ts/logger'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, bearer, genericOAuth, jwt, openAPI, organization, twoFactor } from 'better-auth/plugins'
import { db } from '~/prisma/clients.js'
import { config } from '~/utils/config.js'
import { ac, adminRole, memberRole, ownerRole } from './access-control.js'
import { fetchKeycloakUserInfo, mapKeycloakProfileToUser, mapKeycloakToOrgMemberships, syncOrgMemberships } from './keycloak.js'
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

// ---------------------------------------------------------------------------
// Pending org memberships — short-lived store for OIDC → org sync
//
// During `getUserInfo` we have the full Keycloak profile (realm_roles, groups)
// but not the BetterAuth user ID. After user create/update, `databaseHooks`
// fires with the user record. We bridge the two via a Map keyed by email.
// Entries are consumed (deleted) immediately after sync.
//
// Safety: Maps are capped at MAX_PENDING_ENTRIES to prevent unbounded memory
// growth if consuming hooks fail or are never called.
// ---------------------------------------------------------------------------

const MAX_PENDING_ENTRIES = 1_000

/** @internal */
// Exported for testing only.
export const pendingOrgMemberships = new Map<string, OrgMembership[]>()

// ---------------------------------------------------------------------------
// Pending org creations — bridge between org.create.after and member.create.after
//
// BetterAuth creates the organization record first, then the owner member.
// We stash the org data on creation so that when the first member (owner)
// is added, we can emit a complete audit entry with the actor's userId.
// ---------------------------------------------------------------------------

/** @internal */
export const pendingOrgCreations = new Map<string, Record<string, unknown>>()

/**
 * Build optional Keycloak OAuth plugin when enabled.
 *
 * We intentionally do NOT use Keycloak's OIDC discovery because the
 * discovery response returns endpoints using KC_HOSTNAME (the public URL),
 * which is often unreachable from inside the Docker/K8s network.
 *
 * Instead, we manually configure:
 *   - authorizationUrl → public URL (browser redirect)
 *   - tokenUrl         → internal URL (server-to-server exchange)
 *   - getUserInfo       → internal URL (server-to-server fetch)
 *
 * `publicUrl` defaults to `issuer` when not set, so deployments where the
 * same URL is reachable both internally and externally need no extra config.
 */
function buildKeycloakPlugin() {
  if (!config.keycloak.enabled || !config.keycloak.clientId || !config.keycloak.clientSecret || !config.keycloak.issuer) {
    return undefined
  }

  const issuer = config.keycloak.issuer.replace(/\/$/, '')
  const publicIssuer = (config.keycloak.publicUrl || issuer).replace(/\/$/, '')

  return genericOAuth({
    config: [
      {
        providerId: 'keycloak',
        clientId: config.keycloak.clientId,
        clientSecret: config.keycloak.clientSecret,
        scopes: ['openid', 'profile', 'email'],
        pkce: true,

        // Public URL — used by the browser for the OAuth authorization redirect
        authorizationUrl: `${publicIssuer}/protocol/openid-connect/auth`,
        // Internal URL — used server-side to exchange the authorization code
        tokenUrl: `${issuer}/protocol/openid-connect/token`,
        // Public issuer — for RFC 9207 `iss` parameter validation in the callback
        issuer: publicIssuer,

        // No discoveryUrl — prevents BetterAuth from overwriting our URLs
        // with KC_HOSTNAME-based endpoints from the OIDC discovery document.

        getUserInfo: async (tokens) => {
          const profile = await fetchKeycloakUserInfo(issuer, tokens.accessToken ?? '')
          if (!profile) return null

          // Stash OIDC-derived org memberships for post-sign-in sync
          if (config.keycloak.mapOrgRoles || profile.groups) {
            const memberships = mapKeycloakToOrgMemberships(profile, {
              mapOrgRoles: config.keycloak.mapOrgRoles,
              orgRolePrefix: config.keycloak.orgRolePrefix,
              defaultOrgRole: config.keycloak.defaultOrgRole,
            })
            if (memberships.length > 0 && profile.email) {
              if (pendingOrgMemberships.size >= MAX_PENDING_ENTRIES) pendingOrgMemberships.clear()
              pendingOrgMemberships.set(profile.email as string, memberships)
            }
          }

          return {
            id: profile.sub as string,
            name: (profile.name ?? profile.preferred_username) as string | undefined,
            email: profile.email as string | undefined,
            image: profile.picture as string | undefined,
            emailVerified: (profile.email_verified as boolean) ?? false,
          }
        },

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

const authLogger = createLogger({ name: 'auth' })

/**
 * Fire-and-forget audit log entry for auth-level events (e.g. org creation).
 *
 * Writes directly to the `AuditLog` Prisma model because `databaseHooks`
 * don't have access to the Fastify app context. Respects the audit module
 * toggle — skips when `config.modules.audit` is disabled.
 */
export function logAuthAudit(entry: { actorId: string, action: string, resourceType: string, resourceId?: string, organizationId?: string, details?: Record<string, unknown> }): void {
  if (!config.modules.audit) return
  db.auditLog.create({ data: { ...entry, details: entry.details as Prisma.InputJsonValue } }).catch((err) => {
    authLogger.error(err, '[audit] failed to write auth audit entry')
  })
}

/**
 * Create a personal organization for a newly registered user.
 *
 * Every user gets a personal org so that projects are always scoped to
 * an organization. The slug is derived from the user's ID to guarantee
 * uniqueness.
 */
async function createPersonalOrg(user: Record<string, unknown>): Promise<void> {
  const userId = user.id as string
  const name = (user.name as string | undefined) || 'Personal'
  const slug = `personal-${userId.slice(0, 8)}`

  const org = await db.organization.create({
    data: { name, slug, metadata: JSON.stringify({ personal: true }) },
  })

  await db.member.create({
    data: { userId, organizationId: org.id, role: 'owner' },
  })

  logAuthAudit({
    actorId: userId,
    action: 'organization:create',
    resourceType: 'organization',
    resourceId: org.id,
    details: { name, slug, personal: true },
  })
}

/**
 * Consume pending OIDC-derived org memberships for a user.
 *
 * Called from `databaseHooks.user.create.after` and `.update.after`.
 * Looks up the user's email in the pending map, syncs memberships,
 * then removes the entry. Uses lazy `auth` import to avoid circular init.
 */
async function consumePendingOrgMemberships(user: Record<string, unknown>): Promise<void> {
  const email = user.email as string | undefined
  if (!email) return

  const memberships = pendingOrgMemberships.get(email)
  if (!memberships || memberships.length === 0) return
  pendingOrgMemberships.delete(email)

  const userId = user.id as string

  await syncOrgMemberships(userId, memberships, {
    findOrgBySlug: async (slug) => {
      return db.organization.findFirst({ where: { slug }, select: { id: true } })
    },
    findMember: async (uid, organizationId) => {
      return db.member.findFirst({
        where: { userId: uid, organizationId },
        select: { id: true, role: true },
      })
    },
    addMember: async (uid, organizationId, role) => {
      await db.member.create({
        data: { userId: uid, organizationId, role },
      })
    },
    updateMemberRole: async (memberId, _organizationId, role) => {
      await db.member.update({
        where: { id: memberId },
        data: { role },
      })
    },
  })
}

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
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Auto-set active org to the user's first org if not already set
          if (!session.activeOrganizationId) {
            const membership = await db.member.findFirst({
              where: { userId: session.userId },
              select: { organizationId: true },
              orderBy: { createdAt: 'asc' },
            })
            if (membership) {
              return { data: { ...session, activeOrganizationId: membership.organizationId } }
            }
          }
          return { data: session }
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          await createPersonalOrg(user)
          await consumePendingOrgMemberships(user)
        },
      },
      update: {
        after: async (user) => {
          await consumePendingOrgMemberships(user)
        },
      },
    },
    organization: {
      create: {
        after: async (org: Record<string, unknown>) => {
          if (pendingOrgCreations.size >= MAX_PENDING_ENTRIES) pendingOrgCreations.clear()
          pendingOrgCreations.set(org.id as string, org)
        },
      },
    },
    member: {
      create: {
        after: async (member: Record<string, unknown>) => {
          const orgId = member.organizationId as string
          const pendingOrg = pendingOrgCreations.get(orgId)
          if (pendingOrg) {
            // First member after org creation = the creator (owner)
            pendingOrgCreations.delete(orgId)
            logAuthAudit({
              actorId: member.userId as string,
              action: 'organization:create',
              resourceType: 'organization',
              resourceId: orgId,
              details: { name: pendingOrg.name, slug: pendingOrg.slug },
            })
          } else {
            // Member added to an existing org (invitation accepted, admin add, etc.)
            logAuthAudit({
              actorId: member.userId as string,
              action: 'organization:member:add',
              resourceType: 'organization',
              resourceId: orgId,
              details: { role: member.role },
            })
          }
        },
      },
    },
    apikey: {
      create: {
        after: async (apikey: Record<string, unknown>) => {
          logAuthAudit({
            actorId: apikey.referenceId as string,
            action: 'apikey:create',
            resourceType: 'apikey',
            resourceId: apikey.id as string,
            details: { name: apikey.name },
          })
        },
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
      // Enable per-org custom roles stored in `organization_role` table.
      // BetterAuth exposes CRUD endpoints (create-role, update-role, etc.)
      // and `hasPermission()` automatically resolves dynamic roles.
      dynamicAccessControl: {
        enabled: true,
      },
    }),
    apiKey({
      schema: {
        apikey: {
          modelName: 'apiKey',
        },
      },
    }),
    ...(keycloakPlugin ? [keycloakPlugin] : []),
  ],
})

export type Auth = typeof auth
export type Session = typeof auth.$Infer.Session
