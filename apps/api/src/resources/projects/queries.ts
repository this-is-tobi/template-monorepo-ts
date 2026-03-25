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

function buildProjectWhere(filters?: ProjectQuery & { ownerId?: string }) {
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

export async function getProjectsQuery(filters?: ProjectQuery & { ownerId?: string }) {
  const where = buildProjectWhere(filters)
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

export async function countProjects(filters?: ProjectQuery & { ownerId?: string }) {
  const where = buildProjectWhere(filters)
  return db.project.count(Object.keys(where).length > 0 ? { where } : undefined)
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
