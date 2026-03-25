import type { AdminApiKeyQuery, AdminOrganizationQuery } from '@template-monorepo-ts/shared'
import type { Prisma } from '~/generated/prisma/client.js'
import { db } from '~/prisma/clients.js'

// ---------------------------------------------------------------------------
// Admin Organizations
// ---------------------------------------------------------------------------

export async function getAdminOrganizationsQuery(query: AdminOrganizationQuery) {
  const where = buildOrganizationWhere(query)
  return db.organization.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit,
    skip: query.offset,
    include: { _count: { select: { members: true } } },
  })
}

export async function countAdminOrganizations(query: AdminOrganizationQuery) {
  return db.organization.count({ where: buildOrganizationWhere(query) })
}

function buildOrganizationWhere(query: AdminOrganizationQuery): Prisma.OrganizationWhereInput {
  const where: Prisma.OrganizationWhereInput = {}
  if (query.name) where.name = { contains: query.name, mode: 'insensitive' }
  if (query.slug) where.slug = { contains: query.slug, mode: 'insensitive' }
  if (query.after || query.before) {
    where.createdAt = {}
    if (query.after) where.createdAt.gte = new Date(query.after)
    if (query.before) where.createdAt.lte = new Date(query.before)
  }
  return where
}

// ---------------------------------------------------------------------------
// Admin API Keys
// ---------------------------------------------------------------------------

export async function getAdminApiKeysQuery(query: AdminApiKeyQuery) {
  const where = buildApiKeyWhere(query)
  return db.apiKey.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit,
    skip: query.offset,
    omit: { key: true },
  })
}

export async function countAdminApiKeys(query: AdminApiKeyQuery) {
  return db.apiKey.count({ where: buildApiKeyWhere(query) })
}

function buildApiKeyWhere(query: AdminApiKeyQuery): Prisma.ApiKeyWhereInput {
  const where: Prisma.ApiKeyWhereInput = {}
  if (query.name) where.name = { contains: query.name, mode: 'insensitive' }
  if (query.referenceId) where.referenceId = query.referenceId
  if (query.enabled !== undefined) where.enabled = query.enabled === 'true'
  if (query.after || query.before) {
    where.createdAt = {}
    if (query.after) where.createdAt.gte = new Date(query.after)
    if (query.before) where.createdAt.lte = new Date(query.before)
  }
  return where
}
