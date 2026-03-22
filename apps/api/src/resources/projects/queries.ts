import type { Project } from '@template-monorepo-ts/shared'

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
 * Filters for listing projects.
 */
interface ProjectListFilters {
  ownerId?: string
  organizationId?: string
}

export async function createProjectQuery(data: CreateProjectData) {
  return db
    .project
    .create({ data })
}

export async function getProjectsQuery(filters?: ProjectListFilters) {
  const where: { ownerId?: string, organizationId?: string } = {}
  if (filters?.ownerId) where.ownerId = filters.ownerId
  if (filters?.organizationId) where.organizationId = filters.organizationId
  return db
    .project
    .findMany(Object.keys(where).length > 0 ? { where } : undefined)
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
