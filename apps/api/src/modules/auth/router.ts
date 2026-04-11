import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { getConfigQuery } from '~/resources/config/queries.js'
import { isPersonalOrg } from '~/resources/projects/queries.js'
import { addReqLogs } from '~/utils/logger.js'
import { getActiveOrgIdFromSession } from '~/utils/session.js'
import { auth, logAuthAudit } from './auth.js'
import { toHeaders } from './headers.js'
import { callHasPermission } from './permissions.js'

// ---------------------------------------------------------------------------
// Inline guard functions — extracted from the mega-handler for readability.
// Each guard either sends an error response and returns `true` (= handled),
// or returns `false` to let the request continue.
// ---------------------------------------------------------------------------

/** Block self-registration when disabled in app config. */
async function guardRegistrationDisabled(url: URL, request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (request.method !== 'POST' || !url.pathname.endsWith('/sign-up/email')) return false
  const config = await getConfigQuery()
  if (!config.enableRegistration) {
    reply.code(403).send({ message: 'Registration is currently disabled' })
    return true
  }
  return false
}

/** Block invitations to personal organizations. */
async function guardPersonalOrgInvite(url: URL, request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (request.method !== 'POST' || !url.pathname.endsWith('/invite-member')) return false
  const body = request.body as Record<string, unknown> | undefined
  const organizationId = body?.organizationId as string | undefined
  if (organizationId && await isPersonalOrg(organizationId)) {
    reply.code(403).send({ message: 'Cannot invite members to a personal organization' })
    return true
  }
  return false
}

/** Block organization creation when disabled or quota exceeded. */
async function guardOrgCreationQuota(url: URL, request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (request.method !== 'POST' || !url.pathname.endsWith('/create-organization')) return false

  const appConfig = await getConfigQuery()
  const session = await auth.api.getSession({ headers: toHeaders(request.headers) })
  if (!session?.user) {
    reply.code(401).send({ message: 'Unauthorized' })
    return true
  }
  if (!appConfig.allowOrganizationCreation && session.user.role !== 'admin') {
    reply.code(403).send({ message: 'Organization creation is currently disabled' })
    return true
  }
  if (appConfig.maxOrganizationsPerUser !== null && session.user.role !== 'admin') {
    const { countUserOrganizations } = await import('~/resources/projects/queries.js')
    const count = await countUserOrganizations(session.user.id)
    if (count >= appConfig.maxOrganizationsPerUser) {
      reply.code(403).send({ message: `Organization limit reached (max ${appConfig.maxOrganizationsPerUser})` })
      return true
    }
  }
  return false
}

/**
 * Server-side API key creation — the `permissions` field is marked
 * server-only by BetterAuth, so we intercept the request here and
 * call the server API directly which has no field restrictions.
 */
async function handleServerSideApiKeyCreation(url: URL, request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (request.method !== 'POST' || !url.pathname.endsWith('/api-key/create')) return false

  const session = await auth.api.getSession({ headers: toHeaders(request.headers) })
  if (!session?.user) {
    reply.code(401).send({ message: 'Unauthorized' })
    return true
  }
  const body = request.body as Record<string, unknown> | undefined
  const permissions = body?.permissions as Record<string, string[]> | undefined
  const userRole = (session.user as import('~/utils/session.js').AppUser | undefined)?.role
  const isUserAdmin = userRole?.split(',').map(r => r.trim()).includes('admin') ?? false

  // Validate that the requested API key permissions do not exceed
  // the creator's effective permissions (prevents privilege escalation).
  if (permissions && Object.keys(permissions).length > 0) {
    if (!isUserAdmin) {
      // Non-admin users cannot request wildcard permissions
      const hasWildcard = Object.entries(permissions).some(
        ([resource, actions]) => resource === '*' || actions.includes('*'),
      )
      if (hasWildcard) {
        reply.code(403).send({ message: 'Wildcard permissions are restricted to platform administrators' })
        return true
      }

      // Validate permissions against the user's org role
      const orgId = getActiveOrgIdFromSession(session)
      if (!orgId) {
        reply.code(403).send({ message: 'An active organization is required to create API keys with permissions' })
        return true
      }

      const result = await callHasPermission({
        headers: toHeaders(request.headers),
        userId: session.user.id,
        organizationId: orgId,
        permissions,
      })
      if (!result?.success) {
        reply.code(403).send({ message: 'Requested permissions exceed your current role' })
        return true
      }
    }
  }

  const result = await auth.api.createApiKey({
    body: {
      ...body,
      userId: session.user.id,
      // Scope non-admin keys to their active org so API key auth
      // is limited to the org context it was created within.
      ...(!isUserAdmin && permissions && Object.keys(permissions).length > 0 && (() => {
        const orgId = getActiveOrgIdFromSession(session)
        if (!orgId) return {}
        const existing = typeof body?.metadata === 'string' ? body.metadata : '{}'
        let meta: Record<string, unknown>
        try {
          meta = JSON.parse(existing) as Record<string, unknown>
        } catch {
          meta = {}
        }
        meta.organizationId = orgId
        return { metadata: JSON.stringify(meta) }
      })()),
    },
  })
  reply.code(200).send(result)
  return true
}

/**
 * URL-pattern → audit event mapping for auth lifecycle events.
 * Only POST routes with a 2xx response are audited.
 */
const AUTH_AUDIT_EVENTS: Array<{
  pattern: RegExp
  resourceType: string
  action: string
}> = [
  { pattern: /\/sign-in\//, resourceType: 'session', action: 'sign-in' },
  { pattern: /\/sign-out$/, resourceType: 'session', action: 'sign-out' },
  { pattern: /\/sign-up\//, resourceType: 'user', action: 'sign-up' },
  { pattern: /\/change-password$/, resourceType: 'user', action: 'change-password' },
  { pattern: /\/two-factor\/enable$/, resourceType: 'user', action: '2fa:enable' },
  { pattern: /\/two-factor\/disable$/, resourceType: 'user', action: '2fa:disable' },
  { pattern: /\/forget-password$/, resourceType: 'user', action: 'forget-password' },
  { pattern: /\/reset-password$/, resourceType: 'user', action: 'reset-password' },
]

/** Audit auth lifecycle events (fire-and-forget). */
async function auditAuthEvent(url: URL, request: FastifyRequest, body: string | null): Promise<void> {
  if (request.method !== 'POST') return

  const match = AUTH_AUDIT_EVENTS.find(e => e.pattern.test(url.pathname))
  if (!match) return

  // Try response body first — sign-in/sign-up returns user+session
  let actorId = 'unknown'
  let organizationId: string | undefined
  if (body) {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>
      const user = parsed.user as Record<string, unknown> | undefined
      const session = parsed.session as Record<string, unknown> | undefined
      actorId = (user?.id ?? session?.userId ?? 'unknown') as string
      organizationId = session?.activeOrganizationId as string | undefined
    } catch { /* non-JSON response — fall through */ }
  }
  // Fallback: existing session from request cookies (sign-out, password change)
  if (actorId === 'unknown') {
    const existing = await auth.api.getSession({ headers: toHeaders(request.headers) }).catch(() => null)
    actorId = existing?.user?.id ?? 'unknown'
    organizationId ??= existing ? getActiveOrgIdFromSession(existing) : undefined
  }
  logAuthAudit({ actorId, action: match.action, resourceType: match.resourceType, organizationId })
}

/**
 * Registers the BetterAuth catch-all route.
 * All `/api/v1/auth/*` requests are delegated to BetterAuth's handler which
 * manages sign-up, sign-in, session, 2FA, and OAuth flows.
 */
export function getAuthRouter() {
  return async (app: FastifyInstance) => {
    app.route({
      method: ['GET', 'POST'],
      url: `${apiPrefix.v1}/auth/*`,
      schema: { hide: true }, // hide from Swagger — BetterAuth exposes its own OpenAPI
      config: {
        rateLimit: { max: 20, timeWindow: '1 minute' },
      },
      handler: async (request, reply) => {
        try {
          const url = new URL(request.url, `http://${request.headers.host}`)

          // Run guards — each returns `true` when it has sent a response
          if (await guardRegistrationDisabled(url, request, reply)) return
          if (await guardPersonalOrgInvite(url, request, reply)) return
          if (await guardOrgCreationQuota(url, request, reply)) return
          if (await handleServerSideApiKeyCreation(url, request, reply)) return

          // Fastify has already parsed the body — re-encode it for the
          // Web Request that BetterAuth expects.  When the raw body is a
          // string (e.g. form data) forward it as-is; when it's an object
          // (Fastify parsed JSON) re-serialise it.
          let reqBody: BodyInit | undefined
          if (request.body !== undefined && request.body !== null) {
            reqBody = typeof request.body === 'string'
              ? request.body
              : JSON.stringify(request.body)
          }

          const req = new Request(url.toString(), {
            method: request.method,
            headers: toHeaders(request.headers),
            ...(reqBody !== undefined ? { body: reqBody } : {}),
          })

          const response = await auth.handler(req)

          const body = response.body ? await response.text() : null

          // Audit auth lifecycle events (fire-and-forget)
          if (response.status >= 200 && response.status < 300) {
            auditAuthEvent(url, request, body).catch(() => {})
          }

          reply.code(response.status)
          response.headers.forEach((value, key) => reply.header(key, value))
          reply.send(body)
        } catch (error) {
          addReqLogs({ req: request, message: 'auth handler error', error: error instanceof Error ? error : String(error) })
          reply.code(500).send({ message: 'Internal authentication error' })
        }
      },
    })
  }
}
