import type { CreateProjectServiceKeyBody } from '@template-monorepo-ts/shared'
import type { FastifyRequest } from 'fastify'
import { auth } from '~/modules/auth/auth.js'
import { isAdmin } from '~/modules/auth/middleware.js'
import { db, dbRo } from '~/prisma/clients.js'
import { validateKeyGrant } from '~/resources/api-keys/permissions.js'
import { APIError } from '~/utils/errors.js'
import { addReqLogs } from '~/utils/logger.js'
import { projectMessages } from './constants.js'
import { getProjectMemberRoleQuery } from './queries.js'
import { getOrCreateServiceAccount, getServiceAccount } from './service-accounts.js'

/**
 * API keys owned by a project rather than by a person.
 *
 * The caller chooses a name, a lifetime and the permissions. Everything that
 * decides *what the key can reach* — its owner and its scope — is set here, so
 * a project admin can never mint a key that escapes the project they administer.
 */

/** Public shape of a service key. The secret is only ever returned at creation. */
function toServiceKey(key: {
  id: string
  name: string | null
  start: string | null
  prefix: string | null
  enabled: boolean
  permissions: string | null
  lastRequest: Date | null
  expiresAt: Date | null
  createdAt: Date
}) {
  let permissions: Record<string, string[]> | null = null
  if (key.permissions) {
    try {
      permissions = JSON.parse(key.permissions) as Record<string, string[]>
    } catch {
      permissions = null
    }
  }
  return {
    id: key.id,
    name: key.name,
    start: key.start,
    prefix: key.prefix,
    enabled: key.enabled,
    permissions,
    lastRequest: key.lastRequest?.toISOString() ?? null,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
  }
}

/** Every key owned by the project's service account. */
export async function listProjectServiceKeys(projectId: string) {
  const account = await getServiceAccount(projectId)
  // No account yet simply means no key has ever been minted.
  if (!account) return { data: [], total: 0 }

  const keys = await dbRo.apiKey.findMany({
    where: { referenceId: account.id },
    orderBy: { createdAt: 'desc' },
  })
  return { data: keys.map(toServiceKey), total: keys.length }
}

/**
 * Mint a key owned by the project.
 *
 * Scope is forced to this project (and its organization) regardless of what
 * the caller sends — the whole point is that the credential cannot reach past
 * the project it belongs to, and a project admin is not necessarily trusted
 * org-wide.
 */
export async function createProjectServiceKey(
  req: FastifyRequest,
  project: { id: string, name: string, organizationId: string | null },
  body: CreateProjectServiceKeyBody,
) {
  // The same gate the personal-key paths use. A service account holds no
  // membership of its own, so this column is the *only* thing granting the key
  // anything — nothing downstream re-derives it from what the minter held.
  // Without the check, a project admin who is a plain organization member
  // could mint a key carrying org-wide rights they do not have themselves.
  const grantCheck = await validateKeyGrant(
    {
      userId: req.session!.user.id,
      isAdmin: isAdmin(req),
      headers: req.headers as Record<string, string>,
      // What their project role covers is theirs to delegate; the org check
      // alone would refuse a project admin a read-only key on their own project.
      projectRole: await getProjectMemberRoleQuery(project.id, req.session!.user.id) ?? undefined,
    },
    {
      permissions: body.permissions,
      organizationIds: project.organizationId ? [project.organizationId] : [],
      kind: 'service',
    },
  )
  if (!grantCheck.valid) {
    throw new APIError(403, 'FORBIDDEN', grantCheck.reason)
  }

  const account = await getOrCreateServiceAccount(project)

  const result = await auth.api.createApiKey({
    body: {
      name: body.name,
      userId: account.id,
      ...(body.expiresIn !== undefined ? { expiresIn: body.expiresIn } : {}),
      permissions: body.permissions,
      metadata: {
        projectIds: [project.id],
        // Always written, even when empty. An absent key means "unrestricted"
        // to `checkApiKeyScope`, so omitting it for a project with no
        // organization would hand the key every organization instead of none.
        organizationIds: project.organizationId ? [project.organizationId] : [],
      },
    },
  })

  req.server.auditLogger?.logAsync({
    actorId: req.session!.user.id,
    action: 'project:service-key:create',
    resourceType: 'project',
    resourceId: project.id,
    organizationId: project.organizationId,
    details: { keyId: result.id, name: body.name, permissions: body.permissions },
  })

  addReqLogs({ req, message: 'project service key created', infos: { projectId: project.id, keyId: result.id } })

  return { key: result.key, data: toServiceKey({ ...result, permissions: JSON.stringify(body.permissions) }) }
}

/**
 * Revoke a key.
 *
 * Deleted rather than disabled: a disabled key is a credential still sitting
 * in the database, and "revoke" in the UI has to mean it is gone.
 */
export async function revokeProjectServiceKey(
  req: FastifyRequest,
  project: { id: string, organizationId: string | null },
  keyId: string,
) {
  const account = await getServiceAccount(project.id)
  const key = account
    ? await dbRo.apiKey.findFirst({ where: { id: keyId, referenceId: account.id } })
    : null

  // Checked against *this* project's account, so a project admin cannot
  // revoke a key belonging to another project by guessing its id.
  if (!key) {
    throw new APIError(404, 'NOT_FOUND', projectMessages.serviceKeyNotFound)
  }

  await db.apiKey.delete({ where: { id: keyId } })

  req.server.auditLogger?.logAsync({
    actorId: req.session!.user.id,
    action: 'project:service-key:revoke',
    resourceType: 'project',
    resourceId: project.id,
    organizationId: project.organizationId,
    details: { keyId, name: key.name },
  })

  addReqLogs({ req, message: 'project service key revoked', infos: { projectId: project.id, keyId } })
}
