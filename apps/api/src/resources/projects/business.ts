import type { FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import { isAdmin } from '~/modules/auth/middleware.js'
import { addReqLogs } from '~/utils/index.js'
import { projectMessages } from './constants.js'
import { createProjectQuery, deleteProjectQuery, getProjectByIdQuery, getProjectsQuery, updateProjectQuery } from './queries.js'

/**
 * Discriminated result for ownership-guarded operations.
 *  - `null`        → resource not found (404)
 *  - `'forbidden'` → resource exists but caller is not the owner (403)
 *  - `T`           → success (200 / 201)
 */
export type GuardedResult<T> = T | null | 'forbidden'

/**
 * Input type for creating a project.
 * `ownerId` is not exposed — it is derived from the authenticated session.
 */
export interface CreateProjectInput {
  name: string
  description?: string | null
}

/**
 * Input type for updating a project.
 */
export interface UpdateProjectInput {
  name: string
  description?: string | null
}

export async function createProject(req: FastifyRequest, data: CreateProjectInput) {
  const ownerId = req.session!.user.id
  const project = await createProjectQuery({
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    ownerId,
  })

  addReqLogs({ req, message: projectMessages.created, infos: { projectId: project.id } })
  return project
}

export async function getProjects(req: FastifyRequest) {
  // Admins see all projects; regular users see only their own.
  const ownerId = isAdmin(req) ? undefined : req.session!.user.id
  const projects = await getProjectsQuery(ownerId)

  addReqLogs({ req, message: projectMessages.retrievedAll })
  return projects
}

export async function getProjectById(req: FastifyRequest, id: string): Promise<GuardedResult<Awaited<ReturnType<typeof getProjectByIdQuery>>>> {
  const project = await getProjectByIdQuery(id)

  if (!project) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId: id }, level: 'warn' })
    return null
  }
  if (!isAdmin(req) && project.ownerId !== req.session!.user.id) {
    addReqLogs({ req, message: projectMessages.forbidden, infos: { projectId: id }, level: 'warn' })
    return 'forbidden'
  }
  addReqLogs({ req, message: projectMessages.retrieved, infos: { projectId: id } })
  return project
}

export async function updateProject(req: FastifyRequest, id: string, data: UpdateProjectInput): Promise<GuardedResult<Awaited<ReturnType<typeof updateProjectQuery>>>> {
  const existing = await getProjectByIdQuery(id)

  if (!existing) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId: id }, level: 'warn' })
    return null
  }
  if (!isAdmin(req) && existing.ownerId !== req.session!.user.id) {
    addReqLogs({ req, message: projectMessages.forbidden, infos: { projectId: id }, level: 'warn' })
    return 'forbidden'
  }

  const project = await updateProjectQuery(id, {
    name: data.name,
    description: data.description ?? null,
  })

  addReqLogs({ req, message: projectMessages.updated, infos: { projectId: id } })
  return project
}

export async function deleteProject(req: FastifyRequest, id: string): Promise<GuardedResult<Awaited<ReturnType<typeof deleteProjectQuery>>>> {
  const existing = await getProjectByIdQuery(id)

  if (!existing) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId: id }, level: 'warn' })
    return null
  }
  if (!isAdmin(req) && existing.ownerId !== req.session!.user.id) {
    addReqLogs({ req, message: projectMessages.forbidden, infos: { projectId: id }, level: 'warn' })
    return 'forbidden'
  }

  const project = await deleteProjectQuery(id)

  addReqLogs({ req, message: projectMessages.deleted, infos: { projectId: id } })
  return project
}
