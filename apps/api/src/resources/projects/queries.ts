import type { Project } from '@template-monorepo-ts/shared'

import { db } from '~/prisma/clients.js'

/**
 * Fields accepted when creating a project.
 */
type CreateProjectData = Pick<Project, 'id' | 'name' | 'ownerId'> & { description?: string | null }

/**
 * Fields accepted when updating a project.
 */
type UpdateProjectData = Pick<Project, 'name'> & { description?: string | null }

export async function createProjectQuery(data: CreateProjectData) {
  return db
    .project
    .create({ data })
}

export async function getProjectsQuery(ownerId?: string) {
  return db
    .project
    .findMany(ownerId ? { where: { ownerId } } : undefined)
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
