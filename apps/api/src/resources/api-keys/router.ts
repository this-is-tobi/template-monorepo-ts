import type { UpdateApiKeyBody } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { apiKeyRoutes, parseApiKeyMetadata } from '@template-monorepo-ts/shared'
import { isAdmin } from '~/modules/auth/middleware.js'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { getActiveOrgId } from '~/utils/session.js'
import { validateKeyGrant } from './permissions.js'
import { getApiKeyByIdQuery, updateApiKeyQuery, validateApiKeyScope } from './queries.js'

/** Creates the user-facing API key router plugin for Fastify. */
export function getApiKeyRouter() {
  return async (app: FastifyInstance) => {
    // PUT /api/v1/api-keys/:id — update an API key owned by the caller
    app.put(
      apiKeyRoutes.updateApiKey.path,
      {
        ...createRouteOptions(apiKeyRoutes.updateApiKey),
        preHandler: [app.requireAuth, createZodValidationHandler(apiKeyRoutes.updateApiKey)],
      },
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const body = request.body as UpdateApiKeyBody
        const userId = request.session!.user.id

        const existing = await getApiKeyByIdQuery(id)
        if (!existing) {
          reply.code(404).send({ message: 'API key not found', error: 'NOT_FOUND' })
          return
        }

        // Ownership check — users may only update their own keys
        if (existing.referenceId !== userId) {
          reply.code(403).send({ message: 'Forbidden' })
          return
        }

        // Build Prisma update payload
        const data: { name?: string, permissions?: string | null, metadata?: string | null } = {}
        if (body.name !== undefined) {
          data.name = body.name
        }

        // ── Scope ────────────────────────────────────────────────────────
        // Settled first: the permission check below is evaluated against the
        // organizations the key will be able to act in once this update
        // lands, so the resulting scope has to be known and authorised
        // before it can be used as the yardstick.
        //
        // Sending either scope array REPLACES the whole scope — that is the
        // established semantics of this endpoint (empty arrays clear it).
        const existingMeta = parseApiKeyMetadata(existing.metadata)
        // The scope this update is measured against has to be readable. Were
        // an unreadable value treated as "no scope", an update that never
        // mentioned scope would quietly rewrite a pinned key into an
        // unpinned one — the escalation this endpoint exists to prevent.
        if (!existingMeta) {
          reply.code(500).send({
            message: 'This key\'s scope metadata cannot be read — revoke it and create a replacement',
            error: 'INVALID_KEY_METADATA',
          })
          return
        }
        const scopeChanged = body.organizationIds !== undefined || body.projectIds !== undefined

        if (scopeChanged) {
          // Validate that the user actually has access to the scoped orgs/projects
          const scopeCheck = await validateApiKeyScope(userId, body.organizationIds, body.projectIds)
          if (!scopeCheck.valid) {
            reply.code(403).send({ message: scopeCheck.reason, error: 'INVALID_SCOPE' })
            return
          }
        }

        let finalOrgIds = scopeChanged ? (body.organizationIds ?? []) : (existingMeta.organizationIds ?? [])
        const finalProjectIds = scopeChanged ? (body.projectIds ?? []) : (existingMeta.projectIds ?? [])
        let metadataChanged = scopeChanged

        // ── Permissions ──────────────────────────────────────────────────
        // The `permissions` column is authoritative at request time, so the
        // pair (permissions, scope) must never end up somewhere the caller
        // could not have written it directly.
        //
        // Revalidate whenever EITHER half moves. Re-pointing a key at a new
        // organization is every bit as much of a grant as widening its
        // permissions — checking only the latter let a set validated against
        // org A be aimed at org B, or at no scope at all, by a request that
        // never mentioned permissions.
        const effectivePermissions = body.permissions !== undefined
          ? body.permissions
          : (existing.permissions ? JSON.parse(existing.permissions) as Record<string, string[]> : null)
        const grantsAnything = !!effectivePermissions && Object.keys(effectivePermissions).length > 0

        if (scopeChanged || body.permissions !== undefined) {
          const isPlatformAdmin = isAdmin(request)
          const activeOrgId = getActiveOrgId(request)
          const validationOrgIds = finalOrgIds.length > 0
            ? finalOrgIds
            : (activeOrgId ? [activeOrgId] : [])

          const permissionCheck = await validateKeyGrant(
            {
              userId,
              isAdmin: isPlatformAdmin,
              headers: request.headers as Record<string, string>,
            },
            { permissions: effectivePermissions, organizationIds: validationOrgIds, kind: 'user' },
          )
          if (!permissionCheck.valid) {
            reply.code(403).send({ message: permissionCheck.reason, error: 'INSUFFICIENT_PERMISSIONS' })
            return
          }

          if (body.permissions !== undefined) {
            data.permissions = body.permissions ? JSON.stringify(body.permissions) : null
          }

          // Mirror creation: a non-admin key carrying explicit permissions is
          // pinned to the organizations those permissions were validated
          // against — including when the caller just tried to clear the scope.
          // An unscoped key skips the scope check in `requirePermission`
          // entirely, so "no scope" on a permissioned key means "every tenant",
          // never "none". The gate above already refused the case where there
          // is no organization to pin to.
          if (!isPlatformAdmin && grantsAnything && finalOrgIds.length === 0) {
            finalOrgIds = validationOrgIds
            metadataChanged = true
          }
        }

        if (metadataChanged) {
          const meta: Record<string, unknown> = {}
          if (finalOrgIds.length > 0) {
            meta.organizationIds = finalOrgIds
          }
          if (finalProjectIds.length > 0) {
            meta.projectIds = finalProjectIds
          }
          data.metadata = Object.keys(meta).length > 0 ? JSON.stringify(meta) : null
        }

        const updated = await updateApiKeyQuery(id, data)

        const afterPermissions = updated?.permissions ? JSON.parse(updated.permissions) as Record<string, string[]> : null
        const afterMetadata = updated?.metadata ? JSON.parse(updated.metadata) as Record<string, unknown> : null
        const beforePermissions = existing.permissions ? JSON.parse(existing.permissions) as Record<string, string[]> : null
        const beforeMetadata = existing.metadata ? JSON.parse(existing.metadata) as Record<string, unknown> : null

        const changes: string[] = []
        if ('name' in data) changes.push('name')
        if ('permissions' in data) changes.push('permissions')
        if ('metadata' in data) changes.push('scope')

        app.auditLogger?.logAsync({
          actorId: userId,
          action: 'apikey:update',
          resourceType: 'apikey',
          resourceId: id,
          details: {
            changes,
            before: {
              ...(changes.includes('name') && { name: existing.name }),
              ...(changes.includes('permissions') && { permissions: beforePermissions }),
              ...(changes.includes('scope') && { scope: beforeMetadata }),
            },
            after: {
              ...(changes.includes('name') && { name: body.name ?? existing.name }),
              ...(changes.includes('permissions') && { permissions: afterPermissions }),
              ...(changes.includes('scope') && { scope: afterMetadata }),
            },
          },
        })

        const responseData = updated
          ? {
              ...updated,
              permissions: updated.permissions ? JSON.parse(updated.permissions) as Record<string, string[]> : null,
              metadata: updated.metadata ? JSON.parse(updated.metadata) as Record<string, unknown> : null,
            }
          : null

        reply.code(200).send({ data: responseData })
      },
    )
  }
}
