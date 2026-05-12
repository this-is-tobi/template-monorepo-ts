import type { Project, ProjectMemberQuery, ProjectQuery } from '@template-monorepo-ts/shared'
import { parseOrgMetadata } from '@template-monorepo-ts/shared'

import { db, dbRo } from '~/prisma/clients.js'

/**
 * Fields accepted when creating a project.
 */
type CreateProjectData = Pick<Project, 'id' | 'name' | 'ownerId' | 'description' | 'organizationId'>

/**
 * Fields accepted when updating a project.
 */
type UpdateProjectData = Pick<Project, 'name' | 'description'>

/**
 * Extended filters for project queries.
 * `accessibleBy` restricts results to projects the user can access
 * (owned, member-of, or via org membership).
 */
type ProjectFilters = Omit<ProjectQuery, 'limit' | 'offset'> & { limit?: number, offset?: number, ownerId?: string, accessibleBy?: string }

/** Builds a Prisma `where` clause from basic project filters (name, org, dates). */
function buildProjectWhere(filters?: ProjectFilters) {
  const where: Record<string, unknown> = {}
  if (filters?.id) where.id = { contains: filters.id, mode: 'insensitive' }
  if (filters?.ownerId) where.ownerId = filters.ownerId
  if (filters?.organizationId) where.organizationId = filters.organizationId
  if (filters?.name) where.name = { contains: filters.name, mode: 'insensitive' }
  if (filters?.description) where.description = { contains: filters.description, mode: 'insensitive' }
  if (filters?.after || filters?.before) {
    const createdAt: Record<string, Date> = {}
    if (filters.after) createdAt.gte = new Date(filters.after)
    if (filters.before) createdAt.lte = new Date(filters.before)
    where.createdAt = createdAt
  }
  return where
}

/** Creates a new project record. */
export async function createProjectQuery(data: CreateProjectData) {
  return db
    .project
    .create({ data })
}

/** Owner fields included when listing projects. */
const ownerSelect = { select: { id: true, name: true, email: true, image: true } } as const

/** Lists projects matching the given filters, with pagination. */
export async function getProjectsQuery(filters?: ProjectFilters) {
  const where = await buildAccessibleWhere(filters)
  const hasWhere = Object.keys(where).length > 0
  return dbRo.project.findMany({
    ...(hasWhere ? { where } : {}),
    take: filters?.limit ?? 50,
    skip: filters?.offset ?? 0,
    include: { owner: ownerSelect },
    orderBy: { createdAt: 'desc' },
  })
}

/** Counts projects matching the given filters. */
export async function countProjects(filters?: ProjectFilters) {
  const where = await buildAccessibleWhere(filters)
  return dbRo.project.count(Object.keys(where).length > 0 ? { where } : undefined)
}

/**
 * Wraps `buildProjectWhere` and, when `accessibleBy` is set, adds an OR
 * condition so the user only sees projects they own, are a member of, or
 * that belong to one of their organisations.
 */
/**
 * Extends the basic where clause with an `OR` condition so the user only sees
 * projects they own, are a member of, or belong to an org they can read.
 *
 * The two helper queries (`getProjectIdsForUser`, `getOrgIdsWithProjectAccess`)
 * run in parallel.  For very high-scale deployments, consider replacing this
 * with a materialised database view that pre-joins the access paths.
 */
async function buildAccessibleWhere(filters?: ProjectFilters) {
  const base = buildProjectWhere(filters)

  if (!filters?.accessibleBy) return base

  const userId = filters.accessibleBy
  const [memberProjectIds, orgIds] = await Promise.all([
    getProjectIdsForUser(userId),
    getOrgIdsWithProjectAccess(userId),
  ])

  const orConditions: Record<string, unknown>[] = [{ ownerId: userId }]
  if (memberProjectIds.length > 0) orConditions.push({ id: { in: memberProjectIds } })
  if (orgIds.length > 0) orConditions.push({ organizationId: { in: orgIds } })

  return { ...base, OR: orConditions }
}

/** Finds a project by UUID or returns `null`. */
export async function getProjectByIdQuery(id: string) {
  return dbRo
    .project
    .findUnique({ where: { id } })
}

/** Finds a project by UUID with owner data, or returns `null`. */
export async function getProjectByIdWithOwnerQuery(id: string) {
  return dbRo
    .project
    .findUnique({
      where: { id },
      include: { owner: ownerSelect },
    })
}

/** Updates an existing project's mutable fields. */
export async function updateProjectQuery(id: string, data: UpdateProjectData) {
  return db
    .project
    .update({ where: { id }, data })
}

/** Deletes a project (cascade-deletes its members). */
export async function deleteProjectQuery(id: string) {
  return db
    .project
    .delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// Project members
// ---------------------------------------------------------------------------

/** Returns paginated members of a project, ordered by creation date, with the owner ID and total count. */
export async function getProjectMembersQuery(projectId: string, pagination?: ProjectMemberQuery) {
  const limit = pagination?.limit ?? 50
  const offset = pagination?.offset ?? 0
  const [project, total] = await Promise.all([
    dbRo.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        members: {
          orderBy: { createdAt: 'asc' },
          take: limit,
          skip: offset,
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
      },
    }),
    dbRo.projectMember.count({ where: { projectId } }),
  ])
  return { members: project?.members ?? [], ownerId: project?.ownerId, total }
}

/** Finds a project membership by composite key (projectId + userId). */
export async function getProjectMemberQuery(projectId: string, userId: string) {
  return dbRo.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })
}

/** Creates a new project member record. */
export async function addProjectMemberQuery(data: { id: string, projectId: string, userId: string, role: string }) {
  return db.projectMember.create({ data })
}

/** Updates a project member's role. */
export async function updateProjectMemberQuery(id: string, role: string) {
  return db.projectMember.update({ where: { id }, data: { role } })
}

/** Removes a member from a project. */
export async function removeProjectMemberQuery(id: string) {
  return db.projectMember.delete({ where: { id } })
}

/** Finds a project member by their unique member ID. */
export async function getProjectMemberByIdQuery(id: string) {
  return dbRo.projectMember.findUnique({ where: { id } })
}

/** Returns the user's role on a project, or `null` if not a member. */
export async function getProjectMemberRoleQuery(projectId: string, userId: string): Promise<string | null> {
  const member = await dbRo.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  })
  return member?.role ?? null
}

/** Returns project IDs where the user is a member (not necessarily owner). */
export async function getProjectIdsForUser(userId: string) {
  const memberships = await dbRo.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  })
  return memberships.map(m => m.projectId)
}

/**
 * Static org roles that inherently grant `project:read`.
 * The `member` role has no default permissions — users must be
 * granted access through project membership or custom org roles.
 */
const STATIC_PROJECT_READ_ROLES = new Set(['owner', 'admin'])

/**
 * Returns organization IDs where the user has a role granting `project:read`.
 * Checks both static roles (owner, admin) and dynamic custom roles.
 */
export async function getOrgIdsWithProjectAccess(userId: string): Promise<string[]> {
  const memberships = await dbRo.member.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  })

  const accessOrgIds: string[] = []
  const customRoleMemberships: Array<{ organizationId: string, role: string }> = []

  for (const m of memberships) {
    if (STATIC_PROJECT_READ_ROLES.has(m.role)) {
      accessOrgIds.push(m.organizationId)
    } else if (m.role !== 'member') {
      customRoleMemberships.push(m)
    }
  }

  if (customRoleMemberships.length > 0) {
    const customRoles = await dbRo.organizationRole.findMany({
      where: {
        OR: customRoleMemberships.map(m => ({
          organizationId: m.organizationId,
          role: m.role,
        })),
      },
      select: { organizationId: true, permission: true },
    })

    for (const cr of customRoles) {
      try {
        const perms = JSON.parse(cr.permission) as Record<string, string[]>
        if (
          perms.project?.includes('read')
          || perms.project?.includes('*')
          || perms['*']?.includes('read')
          || perms['*']?.includes('*')
        ) {
          accessOrgIds.push(cr.organizationId)
        }
      } catch {
        // Malformed permission JSON — skip this role (deny-by-default is safe).
        // If this happens frequently, investigate the OrganizationRole data.
      }
    }
  }

  return [...new Set(accessOrgIds)]
}

/** Checks whether a user exists by ID. */
export async function getUserByIdQuery(userId: string) {
  return dbRo.user.findUnique({ where: { id: userId }, select: { id: true } })
}

/** Finds a user by email address. */
export async function getUserByEmailQuery(email: string) {
  return dbRo.user.findFirst({ where: { email }, select: { id: true, email: true } })
}

/** Checks whether a user is a member of a given organization. */
export async function isOrgMember(userId: string, organizationId: string): Promise<boolean> {
  const count = await dbRo.member.count({ where: { userId, organizationId } })
  return count > 0
}

/** Counts the number of organizations a user belongs to. */
export async function countUserOrganizations(userId: string) {
  return dbRo.member.count({ where: { userId } })
}

/** Counts the number of projects in an organization. */
export async function countProjectsInOrganization(organizationId: string) {
  return dbRo.project.count({ where: { organizationId } })
}

/** Returns the max projects quota from an organization's metadata, or `null` for unlimited. */
export async function getOrgMaxProjects(organizationId: string): Promise<number | null> {
  const org = await dbRo.organization.findUnique({ where: { id: organizationId }, select: { metadata: true } })
  const meta = parseOrgMetadata(org?.metadata)
  return meta.maxProjects ?? null
}

/** Checks whether an organization is a personal org (no external members allowed). */
export async function isPersonalOrg(organizationId: string): Promise<boolean> {
  const org = await dbRo.organization.findUnique({ where: { id: organizationId }, select: { metadata: true } })
  const meta = parseOrgMetadata(org?.metadata)
  return meta.personal === true
}
