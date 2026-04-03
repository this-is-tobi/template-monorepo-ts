import type { AddProjectMemberBody, CreateProjectBody, ProjectQuery, UpdateProjectBody, UpdateProjectMemberBody } from '@template-monorepo-ts/shared'
import type { FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import { isAdmin } from '~/modules/auth/middleware.js'
import { addReqLogs, APIError } from '~/utils/index.js'
import { projectMessages } from './constants.js'
import { addProjectMemberQuery, countProjects, createProjectQuery, deleteProjectQuery, getProjectByIdQuery, getProjectMemberByIdQuery, getProjectMemberQuery, getProjectMembersQuery, getProjectsQuery, removeProjectMemberQuery, updateProjectMemberQuery, updateProjectQuery } from './queries.js'

/**
 * Creates a new project owned by the requesting user.
 * Automatically adds the creator as a project member with the `owner` role.
 */
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

/**
 * Lists projects visible to the requesting user.
 * Admins see all projects; regular users see only projects they own,
 * are a member of, or that belong to their organizations.
 */
export async function getProjects(req: FastifyRequest, query?: ProjectQuery) {
  // Admins see all projects; regular users see only accessible ones
  const filters = isAdmin(req) ? { ...query } : { ...query, accessibleBy: req.session!.user.id }
  const projects = await getProjectsQuery(filters)
  const usePagination = query?.limit !== undefined || query?.offset !== undefined
  const total = usePagination ? await countProjects(filters) : undefined

  addReqLogs({ req, message: projectMessages.retrievedAll })
  return { projects, total }
}

/** Fetches a single project by ID, or `null` if not found. */
export async function getProjectById(req: FastifyRequest, id: string) {
  const project = await getProjectByIdQuery(id)

  if (!project) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId: id }, level: 'warn' })
    return null
  }
  addReqLogs({ req, message: projectMessages.retrieved, infos: { projectId: id } })
  return project
}

/** Updates a project's name / description. Returns `null` if not found. */
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

/** Deletes a project and its cascade-deleted members. Returns `null` if not found. */
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

/** Lists all members of a project. Returns `null` if the project doesn't exist. */
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

/**
 * Adds a user as a member of a project.
 *
 * @throws {APIError} 404 if the project doesn't exist.
 * @throws {APIError} 409 if the user is already a member.
 */
export async function addProjectMember(req: FastifyRequest, projectId: string, data: AddProjectMemberBody) {
  const project = await getProjectByIdQuery(projectId)
  if (!project) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId }, level: 'warn' })
    throw new APIError(404, 'NOT_FOUND', projectMessages.notFound)
  }

  const existing = await getProjectMemberQuery(projectId, data.userId)
  if (existing) {
    addReqLogs({ req, message: projectMessages.memberAlreadyExists, infos: { projectId, userId: data.userId }, level: 'warn' })
    throw new APIError(409, 'ALREADY_EXISTS', projectMessages.memberAlreadyExists)
  }

  const member = await addProjectMemberQuery({
    id: randomUUID(),
    projectId,
    userId: data.userId,
    role: data.role,
  })

  addReqLogs({ req, message: projectMessages.memberAdded, infos: { projectId, userId: data.userId } })
  return member
}

/**
 * Updates the role of a project member.
 *
 * @throws {APIError} 404 if the member doesn't exist on this project.
 * @throws {APIError} 403 if attempting to change the owner's role.
 */
export async function updateProjectMember(req: FastifyRequest, projectId: string, memberId: string, data: UpdateProjectMemberBody) {
  const member = await getProjectMemberByIdQuery(memberId)
  if (!member || member.projectId !== projectId) {
    addReqLogs({ req, message: projectMessages.memberNotFound, infos: { projectId, memberId }, level: 'warn' })
    throw new APIError(404, 'NOT_FOUND', projectMessages.memberNotFound)
  }

  if (member.role === 'owner') {
    addReqLogs({ req, message: projectMessages.cannotUpdateOwnerRole, infos: { projectId, memberId }, level: 'warn' })
    throw new APIError(403, 'FORBIDDEN', projectMessages.cannotUpdateOwnerRole)
  }

  const updated = await updateProjectMemberQuery(memberId, data.role)
  addReqLogs({ req, message: projectMessages.memberUpdated, infos: { projectId, memberId } })
  return updated
}

/**
 * Removes a member from a project.
 *
 * @throws {APIError} 404 if the member doesn't exist on this project.
 * @throws {APIError} 403 if attempting to remove the project owner.
 */
export async function removeProjectMember(req: FastifyRequest, projectId: string, memberId: string) {
  const member = await getProjectMemberByIdQuery(memberId)
  if (!member || member.projectId !== projectId) {
    addReqLogs({ req, message: projectMessages.memberNotFound, infos: { projectId, memberId }, level: 'warn' })
    throw new APIError(404, 'NOT_FOUND', projectMessages.memberNotFound)
  }

  if (member.role === 'owner') {
    addReqLogs({ req, message: projectMessages.cannotRemoveOwner, infos: { projectId, memberId }, level: 'warn' })
    throw new APIError(403, 'FORBIDDEN', projectMessages.cannotRemoveOwner)
  }

  await removeProjectMemberQuery(memberId)
  addReqLogs({ req, message: projectMessages.memberRemoved, infos: { projectId, memberId } })
}
