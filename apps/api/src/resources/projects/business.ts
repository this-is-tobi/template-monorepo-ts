import type { AddProjectMemberBody, CreateProjectBody, ProjectQuery, UpdateProjectBody, UpdateProjectMemberBody } from '@template-monorepo-ts/shared'
import type { FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import { isAdmin } from '~/modules/auth/middleware.js'
import { db } from '~/prisma/clients.js'
import { addReqLogs, APIError } from '~/utils/index.js'
import { getActiveOrgId } from '~/utils/session.js'
import { projectMessages } from './constants.js'
import { addProjectMemberQuery, countProjects, countProjectsInOrganization, deleteProjectQuery, getOrgMaxProjects, getProjectByIdQuery, getProjectByIdWithOwnerQuery, getProjectMemberByIdQuery, getProjectMemberQuery, getProjectMembersQuery, getProjectsQuery, getUserByEmailQuery, isOrgMember, removeProjectMemberQuery, updateProjectMemberQuery, updateProjectQuery } from './queries.js'

/**
 * Creates a new project owned by the requesting user.
 * Automatically adds the creator as a project member with the `owner` role.
 * Projects must belong to the user's active organization.
 *
 * @throws {APIError} 400 if no active organization is set.
 * @throws {APIError} 403 if the organization project quota is exceeded.
 */
export async function createProject(req: FastifyRequest, data: CreateProjectBody) {
  const ownerId = req.session!.user.id
  const organizationId = getActiveOrgId(req)

  if (!organizationId) {
    throw new APIError(400, 'BAD_REQUEST', 'An active organization is required to create a project')
  }

  // Enforce per-org project quota (admins are exempt)
  if (!isAdmin(req)) {
    const maxProjects = await getOrgMaxProjects(organizationId)
    if (maxProjects !== null) {
      const count = await countProjectsInOrganization(organizationId)
      if (count >= maxProjects) {
        throw new APIError(403, 'FORBIDDEN', `Project limit reached for this organization (max ${maxProjects})`)
      }
    }
  }

  const projectId = randomUUID()
  const memberId = randomUUID()

  // Atomic: create project + owner member in a single transaction
  // to prevent orphaned projects if the member insert fails.
  const project = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        id: projectId,
        name: data.name,
        description: data.description ?? null,
        ownerId,
        organizationId,
      },
    })
    await tx.projectMember.create({
      data: {
        id: memberId,
        projectId,
        userId: ownerId,
        role: 'owner',
      },
    })
    return created
  })

  req.server.auditLogger?.logAsync({
    actorId: ownerId,
    action: 'project:create',
    resourceType: 'project',
    resourceId: project.id,
    organizationId,
    details: { name: project.name },
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
  const project = req.project !== undefined ? req.project : await getProjectByIdWithOwnerQuery(id)
  // If the preloaded project is lean (no owner include), fetch the full detail
  const detail = project && !('owner' in project) ? await getProjectByIdWithOwnerQuery(id) : project

  if (!detail) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId: id }, level: 'warn' })
    return null
  }
  addReqLogs({ req, message: projectMessages.retrieved, infos: { projectId: id } })
  return detail
}

/** Updates a project's name / description. Returns `null` if not found. */
export async function updateProject(req: FastifyRequest, id: string, data: UpdateProjectBody) {
  const existing = req.project !== undefined ? req.project : await getProjectByIdQuery(id)

  if (!existing) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId: id }, level: 'warn' })
    return null
  }

  const project = await updateProjectQuery(id, {
    name: data.name,
    description: data.description ?? null,
  })

  req.server.auditLogger?.logAsync({
    actorId: req.session!.user.id,
    action: 'project:update',
    resourceType: 'project',
    resourceId: id,
    organizationId: existing.organizationId,
    details: {
      before: { name: existing.name, description: existing.description },
      after: { name: data.name, description: data.description },
    },
  })

  addReqLogs({ req, message: projectMessages.updated, infos: { projectId: id } })
  return project
}

/** Deletes a project and its cascade-deleted members. Returns `null` if not found. */
export async function deleteProject(req: FastifyRequest, id: string) {
  const existing = req.project !== undefined ? req.project : await getProjectByIdQuery(id)

  if (!existing) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId: id }, level: 'warn' })
    return null
  }

  const project = await deleteProjectQuery(id)

  req.server.auditLogger?.logAsync({
    actorId: req.session!.user.id,
    action: 'project:delete',
    resourceType: 'project',
    resourceId: id,
    organizationId: existing.organizationId,
    details: { name: existing.name },
  })

  addReqLogs({ req, message: projectMessages.deleted, infos: { projectId: id } })
  return project
}

/** Lists all members of a project. Returns `null` if the project doesn't exist. */
export async function getProjectMembers(req: FastifyRequest, projectId: string) {
  const project = req.project !== undefined ? req.project : await getProjectByIdQuery(projectId)
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
  const project = req.project !== undefined ? req.project : await getProjectByIdQuery(projectId)
  if (!project) {
    addReqLogs({ req, message: projectMessages.notFound, infos: { projectId }, level: 'warn' })
    throw new APIError(404, 'NOT_FOUND', projectMessages.notFound)
  }

  const user = await getUserByEmailQuery(data.email)
  if (!user) {
    addReqLogs({ req, message: projectMessages.userNotFound, infos: { email: data.email }, level: 'warn' })
    throw new APIError(404, 'NOT_FOUND', projectMessages.userNotFound)
  }

  // Ensure the target user belongs to the project's organization
  if (project.organizationId) {
    const isMember = await isOrgMember(user.id, project.organizationId)
    if (!isMember) {
      addReqLogs({ req, message: projectMessages.userNotInOrganization, infos: { userId: user.id, organizationId: project.organizationId }, level: 'warn' })
      throw new APIError(403, 'FORBIDDEN', projectMessages.userNotInOrganization)
    }
  }

  const existing = await getProjectMemberQuery(projectId, user.id)
  if (existing) {
    addReqLogs({ req, message: projectMessages.memberAlreadyExists, infos: { projectId, userId: user.id }, level: 'warn' })
    throw new APIError(409, 'ALREADY_EXISTS', projectMessages.memberAlreadyExists)
  }

  const member = await addProjectMemberQuery({
    id: randomUUID(),
    projectId,
    userId: user.id,
    role: data.role,
  })

  req.server.auditLogger?.logAsync({
    actorId: req.session!.user.id,
    action: 'project:member:add',
    resourceType: 'project',
    resourceId: projectId,
    organizationId: project.organizationId,
    details: { userId: user.id, role: data.role },
  })

  addReqLogs({ req, message: projectMessages.memberAdded, infos: { projectId, userId: user.id } })
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
  req.server.auditLogger?.logAsync({
    actorId: req.session!.user.id,
    action: 'project:member:update-role',
    resourceType: 'project',
    resourceId: projectId,
    details: { memberId, oldRole: member.role, newRole: data.role },
  })

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

  req.server.auditLogger?.logAsync({
    actorId: req.session!.user.id,
    action: 'project:member:remove',
    resourceType: 'project',
    resourceId: projectId,
    details: { memberId, userId: member.userId },
  })

  addReqLogs({ req, message: projectMessages.memberRemoved, infos: { projectId, memberId } })
}
