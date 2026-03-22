import type { CreateProjectBody, UpdateProjectBody } from '@template-monorepo-ts/shared'
import type { FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import { isAdmin } from '~/modules/auth/middleware.js'
import { addReqLogs } from '~/utils/index.js'
import { projectMessages } from './constants.js'
import { createProjectQuery, deleteProjectQuery, getProjectByIdQuery, getProjectsQuery, updateProjectQuery } from './queries.js'

export async function createProject(req: FastifyRequest, data: CreateProjectBody) {
  const ownerId = req.session!.user.id
  const organizationId = (req.session?.session as Record<string, unknown> | undefined)?.activeOrganizationId as string | undefined ?? null
  const project = await createProjectQuery({
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    ownerId,
    organizationId,
  })

  addReqLogs({ req, message: projectMessages.created, infos: { projectId: project.id } })
  return project
}

export async function getProjects(req: FastifyRequest) {
  // Admins see all projects; regular users see only their own.
  const ownerId = isAdmin(req) ? undefined : req.session!.user.id
  const projects = await getProjectsQuery(ownerId ? { ownerId } : undefined)

  addReqLogs({ req, message: projectMessages.retrievedAll })
  return projects
}

export async function getProjectById(req: FastifyRequest, id: string) {
  const project = await getProjectByIdQuery(id)

  if (!project) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId: id }, level: 'warn' })
    return null
  }
  addReqLogs({ req, message: projectMessages.retrieved, infos: { projectId: id } })
  return project
}

export async function updateProject(req: FastifyRequest, id: string, data: UpdateProjectBody) {
  const existing = await getProjectByIdQuery(id)

  if (!existing) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId: id }, level: 'warn' })
    return null
  }

  const project = await updateProjectQuery(id, {
    name: data.name,
    description: data.description ?? null,
  })

  addReqLogs({ req, message: projectMessages.updated, infos: { projectId: id } })
  return project
}

export async function deleteProject(req: FastifyRequest, id: string) {
  const existing = await getProjectByIdQuery(id)

  if (!existing) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId: id }, level: 'warn' })
    return null
  }

  const project = await deleteProjectQuery(id)

  addReqLogs({ req, message: projectMessages.deleted, infos: { projectId: id } })
  return project
}
