import type { AddProjectMemberBody, CreateProjectBody, ProjectQuery, UpdateProjectBody, UpdateProjectMemberBody } from '@template-monorepo-ts/shared'
import type { FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import { isAdmin } from '~/modules/auth/middleware.js'
import { addReqLogs } from '~/utils/index.js'
import { projectMessages } from './constants.js'
import { addProjectMemberQuery, countProjects, createProjectQuery, deleteProjectQuery, getProjectByIdQuery, getProjectMemberByIdQuery, getProjectMemberQuery, getProjectMembersQuery, getProjectsQuery, removeProjectMemberQuery, updateProjectMemberQuery, updateProjectQuery } from './queries.js'

export async function createProject(req: FastifyRequest, data: CreateProjectBody) {
  const ownerId = req.session!.user.id
  const organizationId = (req.session?.session as Record<string, unknown> | undefined)?.activeOrganizationId as string | undefined ?? null
  const projectId = randomUUID()
  const project = await createProjectQuery({
    id: projectId,
    name: data.name,
    description: data.description ?? null,
    ownerId,
    organizationId,
  })

  // Auto-add the creator as project member with owner role
  await addProjectMemberQuery({
    id: randomUUID(),
    projectId,
    userId: ownerId,
    role: 'owner',
  })

  addReqLogs({ req, message: projectMessages.created, infos: { projectId: project.id } })
  return project
}

export async function getProjects(req: FastifyRequest, query?: ProjectQuery) {
  // Admins see all projects; regular users see only accessible ones
  const filters = isAdmin(req) ? { ...query } : { ...query, accessibleBy: req.session!.user.id }
  const projects = await getProjectsQuery(filters)
  const usePagination = query?.limit !== undefined || query?.offset !== undefined
  const total = usePagination ? await countProjects(filters) : undefined

  addReqLogs({ req, message: projectMessages.retrievedAll })
  return { projects, total }
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

export async function getProjectMembers(req: FastifyRequest, projectId: string) {
  const project = await getProjectByIdQuery(projectId)
  if (!project) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId }, level: 'warn' })
    return null
  }

  const { members, ownerId } = await getProjectMembersQuery(projectId)
  addReqLogs({ req, message: projectMessages.membersRetrieved, infos: { projectId } })
  return { members, ownerId }
}

export async function addProjectMember(req: FastifyRequest, projectId: string, data: AddProjectMemberBody) {
  const project = await getProjectByIdQuery(projectId)
  if (!project) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId }, level: 'warn' })
    return { error: 'notFound' as const }
  }

  const existing = await getProjectMemberQuery(projectId, data.userId)
  if (existing) {
    addReqLogs({ req, message: projectMessages.memberAlreadyExists, infos: { projectId, userId: data.userId }, level: 'warn' })
    return { error: 'alreadyExists' as const }
  }

  const member = await addProjectMemberQuery({
    id: randomUUID(),
    projectId,
    userId: data.userId,
    role: data.role,
  })

  addReqLogs({ req, message: projectMessages.memberAdded, infos: { projectId, userId: data.userId } })
  return { member }
}

export async function updateProjectMember(req: FastifyRequest, projectId: string, memberId: string, data: UpdateProjectMemberBody) {
  const member = await getProjectMemberByIdQuery(memberId)
  if (!member || member.projectId !== projectId) {
    addReqLogs({ req, message: projectMessages.memberNotFound, infos: { projectId, memberId }, level: 'warn' })
    return { error: 'notFound' as const }
  }

  if (member.role === 'owner') {
    addReqLogs({ req, message: projectMessages.cannotRemoveOwner, infos: { projectId, memberId }, level: 'warn' })
    return { error: 'cannotChangeOwner' as const }
  }

  const updated = await updateProjectMemberQuery(memberId, data.role)
  addReqLogs({ req, message: projectMessages.memberUpdated, infos: { projectId, memberId } })
  return { member: updated }
}

export async function removeProjectMember(req: FastifyRequest, projectId: string, memberId: string) {
  const member = await getProjectMemberByIdQuery(memberId)
  if (!member || member.projectId !== projectId) {
    addReqLogs({ req, message: projectMessages.memberNotFound, infos: { projectId, memberId }, level: 'warn' })
    return { error: 'notFound' as const }
  }

  if (member.role === 'owner') {
    addReqLogs({ req, message: projectMessages.cannotRemoveOwner, infos: { projectId, memberId }, level: 'warn' })
    return { error: 'cannotRemoveOwner' as const }
  }

  await removeProjectMemberQuery(memberId)
  addReqLogs({ req, message: projectMessages.memberRemoved, infos: { projectId, memberId } })
  return { success: true }
}
