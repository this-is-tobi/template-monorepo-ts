import type { AdminApiKeyQuery, AdminOrganizationQuery } from '@template-monorepo-ts/shared'
import type { Prisma } from '~/generated/prisma/client.js'
import { dbRo } from '~/prisma/clients.js'

// ---------------------------------------------------------------------------
// Admin Organizations
// ---------------------------------------------------------------------------

/** Fetches a paginated, filtered list of organizations with member counts. */
export async function getAdminOrganizationsQuery(query: AdminOrganizationQuery) {
  const where = buildOrganizationWhere(query)
  return dbRo.organization.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit,
    skip: query.offset,
    include: { _count: { select: { members: true } } },
  })
}

/** Counts organizations matching the given filters. */
export async function countAdminOrganizations(query: AdminOrganizationQuery) {
  return dbRo.organization.count({ where: buildOrganizationWhere(query) })
}

/** Fetches a single organization by ID with members (incl. user data) and invitations. */
export async function getAdminOrganizationByIdQuery(id: string) {
  return dbRo.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      invitations: {
        select: { id: true, email: true, role: true, status: true, expiresAt: true },
        orderBy: { expiresAt: 'desc' },
      },
    },
  })
}

/** Builds a Prisma `where` clause from admin organization query params. */
function buildOrganizationWhere(query: AdminOrganizationQuery): Prisma.OrganizationWhereInput {
  const where: Prisma.OrganizationWhereInput = {}
  if (query.id) where.id = { contains: query.id, mode: 'insensitive' }
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

/** Fetches a paginated, filtered list of API keys (excludes the key hash). */
export async function getAdminApiKeysQuery(query: AdminApiKeyQuery) {
  const where = buildApiKeyWhere(query)
  return dbRo.apiKey.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit,
    skip: query.offset,
    omit: { key: true },
  })
}

/** Counts API keys matching the given filters. */
export async function countAdminApiKeys(query: AdminApiKeyQuery) {
  return dbRo.apiKey.count({ where: buildApiKeyWhere(query) })
}

/** Fetches a single API key by ID (excludes the key hash). */
export async function getAdminApiKeyByIdQuery(id: string) {
  return dbRo.apiKey.findUnique({
    where: { id },
    omit: { key: true },
  })
}

// ---------------------------------------------------------------------------
// Admin Users
// ---------------------------------------------------------------------------

/** Fetches a single user by ID with related resources. */
export async function getAdminUserByIdQuery(id: string) {
  return dbRo.user.findUnique({
    where: { id },
    omit: { twoFactorEnabled: true },
    include: {
      members: {
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      ownedProjects: {
        select: { id: true, name: true, description: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

/** Fetches API keys owned by a user (by referenceId). */
export async function getAdminUserApiKeysQuery(userId: string) {
  return dbRo.apiKey.findMany({
    where: { referenceId: userId },
    omit: { key: true },
    orderBy: { createdAt: 'desc' },
  })
}

/** Builds a Prisma `where` clause from admin API key query params. */
function buildApiKeyWhere(query: AdminApiKeyQuery): Prisma.ApiKeyWhereInput {
  const where: Prisma.ApiKeyWhereInput = {}
  if (query.id) where.id = { contains: query.id, mode: 'insensitive' }
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
