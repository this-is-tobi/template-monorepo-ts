import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { apiPrefix } from '@template-monorepo-ts/shared'
import { db } from '~/prisma/clients.js'
import { validateKeyGrant } from '~/resources/api-keys/permissions.js'
import { getConfigQuery } from '~/resources/config/queries.js'
import { projectMessages } from '~/resources/projects/constants.js'
import { isPersonalOrg } from '~/resources/projects/queries.js'
import { isServiceAccount, isServiceAccountEmail } from '~/resources/projects/service-accounts.js'
import { config } from '~/utils/config.js'
import { addReqLogs } from '~/utils/logger.js'
import { getActiveOrgIdFromSession } from '~/utils/session.js'
import { auth, logAuthAudit } from './auth.js'
import { toHeaders } from './headers.js'

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

/**
 * Keep the service-account namespace unusable by people.
 *
 * A project's service account is provisioned lazily at `<projectId>@…`, so
 * without this someone could register that address first and make the
 * provisioning fail — or, worse, hold an account the project believes is its
 * own machine identity.
 */
async function guardReservedEmail(url: URL, request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (request.method !== 'POST' || !url.pathname.endsWith('/sign-up/email')) return false
  const email = (request.body as { email?: string } | undefined)?.email
  if (isServiceAccountEmail(email)) {
    reply.code(403).send({ message: 'That email domain is reserved' })
    return true
  }
  return false
}

/**
 * Keep the admin user-management endpoints off service accounts.
 *
 * They are `user` rows, so `set-role`, `ban-user`, `impersonate-user` and
 * friends would all happily operate on one — promoting a project's machine
 * identity to platform admin, or impersonating it. None of that is meaningful
 * for an account that cannot sign in; all of it is dangerous. Service accounts
 * are managed only through the project that owns them.
 */
async function guardServiceAccountMutation(url: URL, request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (request.method !== 'POST' || !url.pathname.includes('/admin/')) return false
  const userId = (request.body as { userId?: string } | undefined)?.userId
  if (!userId) return false

  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true, serviceProjectId: true } })
  if (isServiceAccount(target)) {
    reply.code(403).send({ message: projectMessages.cannotManageServiceAccount })
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

/**
 * Accept an invitation to an organization the caller already belongs to.
 *
 * Accepting flips the invitation to `accepted` and then inserts a member row,
 * without first checking whether one exists. When the recipient joined by some
 * other route in the meantime — added directly, a re-seeded dataset — that
 * insert hits the `(userId, organizationId)` unique index, the flip is rolled
 * back, and the request fails. The invitation stays pending and fails the same
 * way every time: the only way to clear it is to *decline* an invitation to an
 * organization you are already in.
 *
 * Its purpose is already served, so accepting is idempotent — settle the
 * invitation and answer with the membership the caller expected to receive.
 * The existing role is left alone: it predates the invitation, and changing it
 * here would be a promotion nobody asked for. Every other case falls through
 * to BetterAuth, which owns the real checks.
 */
async function guardSettledInvitation(url: URL, request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (request.method !== 'POST' || !url.pathname.endsWith('/accept-invitation')) return false
  const invitationId = (request.body as { invitationId?: unknown } | undefined)?.invitationId
  // Typed, not just truthy: a non-string id would reach Prisma as a malformed
  // `where` and throw, turning a request BetterAuth answers with a 400 into a
  // 500 from here.
  if (typeof invitationId !== 'string' || !invitationId) return false

  const session = await auth.api.getSession({ headers: toHeaders(request.headers) })
  if (!session?.user) return false

  const invitation = await db.invitation.findUnique({ where: { id: invitationId } })
  // Anything BetterAuth would reject stays BetterAuth's to reject, so that
  // this guard can never turn a refusal into a success.
  if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) return false
  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) return false

  const member = await db.member.findFirst({
    where: { organizationId: invitation.organizationId, userId: session.user.id },
  })
  if (!member) return false

  const settled = await db.invitation.update({ where: { id: invitationId }, data: { status: 'accepted' } })
  logAuthAudit({
    actorId: session.user.id,
    action: 'invitation:accept',
    resourceType: 'organization',
    resourceId: invitation.organizationId,
    details: { ...requestOrigin(request), invitationId, role: member.role, alreadyMember: true },
  })
  reply.code(200).send({ invitation: settled, member })
  return true
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
 * Build the API-key metadata scope override for a non-admin key creation.
 *
 * Non-admin keys with custom permissions are pinned to the creator's
 * active organization so the key cannot be used to act in another org.
 *
 * Returns either `{ metadata: '{...}' }` to be spread into the create-key
 * body, or `{}` when no override is needed (no active org, or invalid
 * input). Existing metadata fields are preserved; only `organizationIds`
 * is added/overwritten.
 */
function buildApiKeyScopeMetadata(
  session: { user: { id: string } } & { session?: unknown },
  body: { metadata?: unknown } | undefined,
): { metadata: Record<string, unknown> } | Record<string, never> {
  const orgId = getActiveOrgIdFromSession(session)
  if (!orgId) return {}

  // Existing metadata may be an object (from frontend) or a JSON string (legacy)
  let meta: Record<string, unknown>
  const rawMeta = body?.metadata
  if (rawMeta && typeof rawMeta === 'object') {
    meta = { ...(rawMeta as Record<string, unknown>) }
  } else if (typeof rawMeta === 'string') {
    try {
      meta = JSON.parse(rawMeta) as Record<string, unknown>
    } catch {
      meta = {}
    }
  } else {
    meta = {}
  }
  meta.organizationIds = [orgId]
  return { metadata: meta }
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

  // The one gate every API-key grant passes — shared with `PUT /api-keys/:id`
  // and with project service keys. A key that can be widened after the fact,
  // or minted wide through a different door, is no more constrained than one
  // minted wide here.
  const activeOrgId = getActiveOrgIdFromSession(session)
  const check = await validateKeyGrant(
    {
      userId: session.user.id,
      isAdmin: isUserAdmin,
      headers: toHeaders(request.headers),
    },
    {
      permissions,
      organizationIds: activeOrgId ? [activeOrgId] : [],
      kind: 'user',
    },
  )
  if (!check.valid) {
    reply.code(403).send({ message: check.reason })
    return true
  }

  const result = await auth.api.createApiKey({
    body: {
      ...body,
      userId: session.user.id,
      // Scope non-admin keys to their active org so API key auth
      // is limited to the org context it was created within.
      ...(!isUserAdmin && permissions && Object.keys(permissions).length > 0
        ? buildApiKeyScopeMetadata(session, body)
        : {}),
    },
  })
  reply.code(200).send(result)
  return true
}

/**
 * How the actor behind an audited event is identified.
 *
 * - `response` — the handler's response body carries the user (sign-in, sign-up).
 * - `request`  — the caller was already authenticated and stays so (2FA, password).
 * - `before`   — the request DESTROYS the session it should be attributed to, so
 *                the actor must be resolved before the handler runs.
 * - `set-cookie` — the request CREATES the session, and the only place it exists
 *                is the `Set-Cookie` on the response (OAuth provider callback).
 */
type ActorSource = 'response' | 'request' | 'before' | 'set-cookie'

interface AuthAuditEvent {
  pattern: RegExp
  resourceType: string
  action: string
  /** HTTP method this event fires on. Defaults to POST. */
  method?: 'GET' | 'POST'
  /** Defaults to `response`, falling back to `request`. */
  actorFrom?: ActorSource
}

/**
 * URL-pattern → audit event mapping for auth lifecycle events.
 * Only matched routes with a non-error response are audited.
 */
const AUTH_AUDIT_EVENTS: AuthAuditEvent[] = [
  // `sign-in/oauth2` and `sign-in/social` are deliberately excluded: they only
  // hand back a redirect URL, so nobody is authenticated yet and the response
  // carries no user. Auditing them recorded a "sign-in" by `unknown` for every
  // flow, including ones abandoned at the provider — while the sign-in that
  // actually happened, at the callback below, went unrecorded entirely.
  { pattern: /\/sign-in\/(?!oauth2$|social$)/, resourceType: 'session', action: 'sign-in' },
  { pattern: /\/(?:oauth2\/)?callback\/[^/]+$/, method: 'GET', resourceType: 'session', action: 'sign-in', actorFrom: 'set-cookie' },
  { pattern: /\/sign-out$/, resourceType: 'session', action: 'sign-out', actorFrom: 'before' },
  { pattern: /\/sign-up\//, resourceType: 'user', action: 'sign-up' },
  { pattern: /\/change-password$/, resourceType: 'user', action: 'change-password', actorFrom: 'request' },
  { pattern: /\/two-factor\/enable$/, resourceType: 'user', action: '2fa:enable', actorFrom: 'request' },
  { pattern: /\/two-factor\/disable$/, resourceType: 'user', action: '2fa:disable', actorFrom: 'request' },
  { pattern: /\/forget-password$/, resourceType: 'user', action: 'forget-password' },
  { pattern: /\/reset-password$/, resourceType: 'user', action: 'reset-password' },
  { pattern: /\/accept-invitation$/, resourceType: 'organization', action: 'invitation:accept' },
  { pattern: /\/reject-invitation$/, resourceType: 'organization', action: 'invitation:reject' },
]

/** Find the audit event a request matches, if any. */
function matchAuthAuditEvent(url: URL, method: string): AuthAuditEvent | undefined {
  return AUTH_AUDIT_EVENTS.find(e => (e.method ?? 'POST') === method && e.pattern.test(url.pathname))
}

/**
 * Rebuild a `cookie` request header from a response's `Set-Cookie` headers.
 *
 * Used to read back a session that the request just created: at the OAuth
 * callback the browser has no session cookie yet, so the freshly issued one on
 * the response is the only way to attribute the sign-in to a user.
 */
function cookieHeaderFromResponse(response: Response): string | undefined {
  const setCookies = response.headers.getSetCookie()
  if (setCookies.length === 0) return undefined
  return setCookies.map(cookie => cookie.split(';')[0]).join('; ')
}

/**
 * Where the request came from.
 *
 * Attached to every auth event: an audit trail that records *that* someone
 * signed in but not from where is of little use in an investigation.
 */
function requestOrigin(request: FastifyRequest): Record<string, unknown> {
  return {
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
  }
}

/** Resolved identity of whoever performed an audited auth action. */
interface AuthActor {
  actorId?: string
  organizationId?: string
}

/** Read the actor from a session resolved with the given cookie header. */
async function actorFromCookie(cookie: string | undefined): Promise<AuthActor> {
  if (!cookie) return {}
  const session = await auth.api.getSession({ headers: new Headers({ cookie }) }).catch(() => null)
  if (!session) return {}
  return { actorId: session.user?.id, organizationId: getActiveOrgIdFromSession(session) }
}

/**
 * Resolve the actor from the session the request arrived with.
 *
 * Called BEFORE the handler for events that destroy that session — with a
 * cookie cache in play, a post-hoc lookup succeeds or fails depending on
 * whether the cache is still warm, which is why sign-out was intermittently
 * attributed to `unknown`.
 */
export async function resolveActorBefore(url: URL, request: FastifyRequest): Promise<AuthActor | undefined> {
  const match = matchAuthAuditEvent(url, request.method)
  if (match?.actorFrom !== 'before') return undefined

  const session = await auth.api.getSession({ headers: toHeaders(request.headers) }).catch(() => null)
  if (!session) return {}
  return { actorId: session.user?.id, organizationId: getActiveOrgIdFromSession(session) }
}

/**
 * Audit auth lifecycle events (fire-and-forget).
 *
 * `preResolved` carries the actor captured before the handler ran, for events
 * that invalidate the session they belong to.
 */
async function auditAuthEvent(
  url: URL,
  request: FastifyRequest,
  response: Response,
  body: string | null,
  preResolved: AuthActor | undefined,
): Promise<void> {
  const match = matchAuthAuditEvent(url, request.method)
  if (!match) return

  const reqBody = request.body as Record<string, unknown> | undefined

  let actorId = preResolved?.actorId
  let organizationId = preResolved?.organizationId
  // Every auth event carries where it came from — an audit trail that records
  // a sign-in without its origin is of little use in an investigation.
  let details: Record<string, unknown> = requestOrigin(request)

  // Response body first — sign-in / sign-up return the user and session.
  if (!actorId && body) {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>
      const user = parsed.user as Record<string, unknown> | undefined
      const session = parsed.session as Record<string, unknown> | undefined
      actorId = (user?.id ?? session?.userId) as string | undefined
      organizationId ??= session?.activeOrganizationId as string | undefined

      if (match.action === 'sign-up') {
        const provider = url.pathname.split('/sign-up/')[1]?.split('/')[0] ?? 'unknown'
        details = { ...details, email: reqBody?.email as string | undefined, method: provider }
      } else if (match.action === 'invitation:accept') {
        const invitation = parsed.invitation as Record<string, unknown> | undefined
        const member = parsed.member as Record<string, unknown> | undefined
        organizationId ??= (invitation?.organizationId ?? member?.organizationId) as string | undefined
        details = { ...details, invitationId: invitation?.id as string | undefined, role: (member?.role ?? invitation?.role) as string | undefined }
      } else if (match.action === 'invitation:reject') {
        const invitation = parsed.invitation as Record<string, unknown> | undefined
        organizationId ??= invitation?.organizationId as string | undefined
        details = { ...details, invitationId: invitation?.id as string | undefined }
      }
    } catch { /* non-JSON response — fall through */ }
  }

  // A provider callback signs the user in via `Set-Cookie`; the incoming
  // request had no session to read.
  if (!actorId && match.actorFrom === 'set-cookie') {
    const resolved = await actorFromCookie(cookieHeaderFromResponse(response))
    actorId = resolved.actorId
    organizationId ??= resolved.organizationId
  }

  // Otherwise the caller was already authenticated and still is.
  if (!actorId && match.actorFrom !== 'before') {
    const resolved = await actorFromCookie(request.headers.cookie)
    actorId = resolved.actorId
    organizationId ??= resolved.organizationId
  }

  if (match.action === 'sign-in') {
    // The URL names how the session was obtained: `/sign-in/email` → email,
    // `/oauth2/callback/keycloak` → keycloak.
    const provider = url.pathname.includes('/callback/')
      ? url.pathname.split('/callback/')[1]?.split('/')[0]
      : url.pathname.split('/sign-in/')[1]?.split('/')[0]
    details = { ...details, method: provider ?? 'unknown' }
  }

  if (match.action === 'forget-password') {
    details = { ...details, email: reqBody?.email as string | undefined }
  }

  logAuthAudit({
    // `unknown` is a genuine outcome for unauthenticated actions such as
    // `forget-password`, not a resolution failure.
    actorId: actorId ?? 'unknown',
    action: match.action,
    resourceType: match.resourceType,
    organizationId,
    details,
  })
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
        rateLimit: { max: config.server.rateLimit.authMax, timeWindow: '1 minute' },
      },
      handler: async (request, reply) => {
        try {
          const url = new URL(request.url, `http://${request.headers.host}`)

          // Run guards — each returns `true` when it has sent a response
          if (await guardRegistrationDisabled(url, request, reply)) return
          if (await guardReservedEmail(url, request, reply)) return
          if (await guardServiceAccountMutation(url, request, reply)) return
          if (await guardPersonalOrgInvite(url, request, reply)) return
          if (await guardSettledInvitation(url, request, reply)) return
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

          // Sign-out destroys the session it must be attributed to, so the
          // actor has to be read while it still exists.
          const preResolvedActor = await resolveActorBefore(url, request)

          const response = await auth.handler(req)

          const body = response.body ? await response.text() : null

          // Audit auth lifecycle events (fire-and-forget). Redirects count as
          // success: an OAuth callback signs the user in and answers 302.
          if (response.status < 400) {
            auditAuthEvent(url, request, response, body, preResolvedActor).catch(() => {})
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
