import type { Project, ProjectQuery } from '@template-monorepo-ts/shared'
import { parseOrgMetadata } from '@template-monorepo-ts/shared'

import { db } from '~/prisma/clients.js'

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
type ProjectFilters = ProjectQuery & { ownerId?: string, accessibleBy?: string }

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

/** Lists projects matching the given filters, with optional pagination. */
export async function getProjectsQuery(filters?: ProjectFilters) {
  const where = await buildAccessibleWhere(filters)
  const hasWhere = Object.keys(where).length > 0

  if (filters?.limit !== undefined || filters?.offset !== undefined) {
    return db.project.findMany({
      ...(hasWhere ? { where } : {}),
      ...(filters.limit !== undefined ? { take: filters.limit } : {}),
      ...(filters.offset !== undefined ? { skip: filters.offset } : {}),
      include: { owner: ownerSelect },
      orderBy: { createdAt: 'desc' },
    })
  }

  return db.project.findMany({
    ...(hasWhere ? { where } : {}),
    include: { owner: ownerSelect },
    orderBy: { createdAt: 'desc' },
  })
}

/** Counts projects matching the given filters. */
export async function countProjects(filters?: ProjectFilters) {
  const where = await buildAccessibleWhere(filters)
  return db.project.count(Object.keys(where).length > 0 ? { where } : undefined)
}

/**
 * Wraps `buildProjectWhere` and, when `accessibleBy` is set, adds an OR
 * condition so the user only sees projects they own, are a member of, or
 * that belong to one of their organisations.
 */
async function buildAccessibleWhere(filters?: ProjectFilters) {
  const base = buildProjectWhere(filters)

  if (!filters?.accessibleBy) return base

  const userId = filters.accessibleBy
  const [memberProjectIds, orgIds] = await Promise.all([
    getProjectIdsForUser(userId),
    getOrgIdsForUser(userId),
  ])

  const orConditions: Record<string, unknown>[] = [{ ownerId: userId }]
  if (memberProjectIds.length > 0) orConditions.push({ id: { in: memberProjectIds } })
  if (orgIds.length > 0) orConditions.push({ organizationId: { in: orgIds } })

  return { ...base, OR: orConditions }
}

/** Finds a project by UUID or returns `null`. */
export async function getProjectByIdQuery(id: string) {
  return db
    .project
    .findUnique({ where: { id } })
}

/** Finds a project by UUID with owner data, or returns `null`. */
export async function getProjectDetailQuery(id: string) {
  return db
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

/** Maximum members returned per project listing. */
const MAX_PROJECT_MEMBERS = 1_000

/** Returns all members of a project, ordered by creation date, with the owner ID. */
export async function getProjectMembersQuery(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: {
        orderBy: { createdAt: 'asc' },
        take: MAX_PROJECT_MEMBERS,
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  })
  return { members: project?.members ?? [], ownerId: project?.ownerId }
}

/** Finds a project membership by composite key (projectId + userId). */
export async function getProjectMemberQuery(projectId: string, userId: string) {
  return db.projectMember.findUnique({
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
  return db.projectMember.findUnique({ where: { id } })
}

/** Returns the user's role on a project, or `null` if not a member. */
export async function getProjectMemberRoleQuery(projectId: string, userId: string): Promise<string | null> {
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  })
  return member?.role ?? null
}

/** Returns project IDs where the user is a member (not necessarily owner). */
export async function getProjectIdsForUser(userId: string) {
  const memberships = await db.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  })
  return memberships.map(m => m.projectId)
}

/** Returns organization IDs where the user is a member. */
export async function getOrgIdsForUser(userId: string) {
  const memberships = await db.member.findMany({
    where: { userId },
    select: { organizationId: true },
  })
  return memberships.map((m: { organizationId: string }) => m.organizationId)
}

/** Checks whether a user exists by ID. */
export async function getUserByIdQuery(userId: string) {
  return db.user.findUnique({ where: { id: userId }, select: { id: true } })
}

/** Finds a user by email address. */
export async function getUserByEmailQuery(email: string) {
  return db.user.findFirst({ where: { email }, select: { id: true } })
}

/** Checks whether a user is a member of a given organization. */
export async function isOrgMember(userId: string, organizationId: string): Promise<boolean> {
  const count = await db.member.count({ where: { userId, organizationId } })
  return count > 0
}

/** Counts the number of organizations a user belongs to. */
export async function countUserOrganizations(userId: string) {
  return db.member.count({ where: { userId } })
}

/** Counts the number of projects in an organization. */
export async function countProjectsInOrganization(organizationId: string) {
  return db.project.count({ where: { organizationId } })
}

/** Returns the max projects quota from an organization's metadata, or `null` for unlimited. */
export async function getOrgMaxProjects(organizationId: string): Promise<number | null> {
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { metadata: true } })
  const meta = parseOrgMetadata(org?.metadata)
  return meta.maxProjects ?? null
}
