import type { CreateProjectServiceKeyBody } from '@template-monorepo-ts/shared'
import type { FastifyRequest } from 'fastify'
import { forbiddenServiceKeyGrants } from '@template-monorepo-ts/shared'
import { auth } from '~/modules/auth/auth.js'
import { db, dbRo } from '~/prisma/clients.js'
import { APIError } from '~/utils/errors.js'
import { addReqLogs } from '~/utils/logger.js'
import { projectMessages } from './constants.js'
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
  const forbidden = forbiddenServiceKeyGrants(body.permissions)
  if (forbidden.length > 0) {
    throw new APIError(
      403,
      'FORBIDDEN',
      `${projectMessages.serviceKeyForbiddenPermission} (${forbidden.join(', ')})`,
    )
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
        ...(project.organizationId ? { organizationIds: [project.organizationId] } : {}),
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
