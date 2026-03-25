import type { Project, ProjectQuery } from '@template-monorepo-ts/shared'

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

function buildProjectWhere(filters?: ProjectFilters) {
  const where: Record<string, unknown> = {}
  if (filters?.ownerId) where.ownerId = filters.ownerId
  if (filters?.organizationId) where.organizationId = filters.organizationId
  if (filters?.name) where.name = { contains: filters.name, mode: 'insensitive' }
  if (filters?.after || filters?.before) {
    const createdAt: Record<string, Date> = {}
    if (filters.after) createdAt.gte = new Date(filters.after)
    if (filters.before) createdAt.lte = new Date(filters.before)
    where.createdAt = createdAt
  }
  return where
}

export async function createProjectQuery(data: CreateProjectData) {
  return db
    .project
    .create({ data })
}

export async function getProjectsQuery(filters?: ProjectFilters) {
  const where = await buildAccessibleWhere(filters)
  const hasWhere = Object.keys(where).length > 0

  if (filters?.limit !== undefined || filters?.offset !== undefined) {
    return db.project.findMany({
      ...(hasWhere ? { where } : {}),
      ...(filters.limit !== undefined ? { take: filters.limit } : {}),
      ...(filters.offset !== undefined ? { skip: filters.offset } : {}),
      orderBy: { createdAt: 'desc' },
    })
  }

  return db.project.findMany(hasWhere ? { where } : undefined)
}

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
  const memberProjectIds = await getProjectIdsForUser(userId)
  const orgIds = await getOrgIdsForUser(userId)

  const orConditions: Record<string, unknown>[] = [{ ownerId: userId }]
  if (memberProjectIds.length > 0) orConditions.push({ id: { in: memberProjectIds } })
  if (orgIds.length > 0) orConditions.push({ organizationId: { in: orgIds } })

  return { ...base, OR: orConditions }
}

export async function getProjectByIdQuery(id: string) {
  return db
    .project
    .findUnique({ where: { id } })
}

export async function updateProjectQuery(id: string, data: UpdateProjectData) {
  return db
    .project
    .update({ where: { id }, data })
}

export async function deleteProjectQuery(id: string) {
  return db
    .project
    .delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// Project members
// ---------------------------------------------------------------------------

export async function getProjectMembersQuery(projectId: string) {
  const members = await db.projectMember.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  })
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })
  return { members, ownerId: project!.ownerId }
}

export async function getProjectMemberQuery(projectId: string, userId: string) {
  return db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })
}

export async function addProjectMemberQuery(data: { id: string, projectId: string, userId: string, role: string }) {
  return db.projectMember.create({ data })
}

export async function updateProjectMemberQuery(id: string, role: string) {
  return db.projectMember.update({ where: { id }, data: { role } })
}

export async function removeProjectMemberQuery(id: string) {
  return db.projectMember.delete({ where: { id } })
}

export async function getProjectMemberByIdQuery(id: string) {
  return db.projectMember.findUnique({ where: { id } })
}

export async function getProjectIdsForUser(userId: string) {
  const memberships = await db.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  })
  return memberships.map(m => m.projectId)
}

export async function getOrgIdsForUser(userId: string) {
  const memberships = await db.member.findMany({
    where: { userId },
    select: { organizationId: true },
  })
  return memberships.map((m: { organizationId: string }) => m.organizationId)
}
