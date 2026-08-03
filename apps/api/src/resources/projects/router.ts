import type { AddProjectMemberBody, CreateProjectBody, CreateProjectServiceKeyBody, ProjectMemberQuery, ProjectQuery, UpdateProjectBody, UpdateProjectMemberBody } from '@template-monorepo-ts/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { Project } from '~/generated/prisma/client.js'
import { projectRoutes } from '@template-monorepo-ts/shared'
import { createProtection, createRouteOptions, getRouteParam } from '~/utils/index.js'
import { addProjectMember, createProject, deleteProject, getProjectById, getProjectMembers, getProjects, removeProjectMember, updateProject, updateProjectMember } from './business.js'
import { projectMessages } from './constants.js'
import { getProjectByIdWithOwnerQuery, getProjectMemberRoleQuery } from './queries.js'
import { createProjectServiceKey, listProjectServiceKeys, revokeProjectServiceKey } from './service-keys.js'

// ---- Fastify augmentation for preloaded project ----------------------------
declare module 'fastify' {
  interface FastifyRequest {
    /** Preloaded project for `:id` routes — avoids repeated DB lookups. */
    project?: Project | null
  }
}

/** Extract `:id` route param — used for API key project-scope enforcement. */
const getProjectId = (req: FastifyRequest) => getRouteParam(req, 'id')

/** Read the preloaded project's organization ID (O(0) DB). */
const getOrganizationId = (req: FastifyRequest) => req.project?.organizationId ?? undefined

/** Read the preloaded project's owner ID (O(0) DB). */
const getOwnerId = (req: FastifyRequest) => req.project?.ownerId

/** Reads the user's project-member role (1 DB query, via composite unique index). */
async function getProjectMemberRole(req: FastifyRequest) {
  const id = getRouteParam(req, 'id')
  return (await getProjectMemberRoleQuery(id, req.session!.user.id)) ?? undefined
}

/**
 * PreHandler — loads the project by `:id` and stashes it on `req.project`.
 * Must run after `requireAuth` so that `req.session` is available.
 */
async function preloadProject(req: FastifyRequest) {
  const id = getRouteParam(req, 'id')
  req.project = await getProjectByIdWithOwnerQuery(id)
}

/** Creates the project router plugin for Fastify. */
export function getProjectRouter() {
  return async (app: FastifyInstance) => {
    const protect = createProtection(app)

    /**
     * Builds the standard preHandler chain for a project-scoped `:id` route:
     * auth → Zod validation → project preload → permission check
     * (with ownership / org-role / project-member-role fallbacks).
     */
    const projectProtection = (
      route: Parameters<typeof protect.permission>[0],
      permissions: Record<string, string[]>,
    ) => protect.permission(
      route,
      {
        permissions,
        getProjectId,
        getOrganizationId,
        getOwnerId,
        getProjectMemberRole,
      },
      [preloadProject],
    )

    /** Shorthand for the common case — an action on the project itself. */
    const projectAction = (
      route: Parameters<typeof protect.permission>[0],
      action: 'create' | 'read' | 'update' | 'delete' | 'manage-members',
    ) => projectProtection(route, { project: [action] })

    // POST /api/v1/projects — requires project:create permission
    app.post(
      projectRoutes.createProject.path,
      {
        ...createRouteOptions(projectRoutes.createProject),
        preHandler: protect.permission(projectRoutes.createProject, { project: ['create'] }),
      },
      async (request, reply) => {
        const project = await createProject(request, request.body as CreateProjectBody)

        reply.code(201).send({
          message: projectMessages.created,
          data: project,
        })
      },
    )

    // GET /api/v1/projects — any authenticated user can list projects.
    // The business layer scopes results via `accessibleBy` so non-admins
    // only see projects they own, are a member of, or belong to their org.
    app.get(
      projectRoutes.getProjects.path,
      { ...createRouteOptions(projectRoutes.getProjects), preHandler: protect.auth(projectRoutes.getProjects) },
      async (request, reply) => {
        const query = request.query as ProjectQuery
        const { projects, total } = await getProjects(request, query)

        reply.code(200).send({
          message: projectMessages.retrievedAll,
          data: projects,
          total,
        })
      },
    )

    // GET /api/v1/projects/:id — requires project:read (with ownership fallback)
    app.get(
      projectRoutes.getProjectById.path,
      {
        ...createRouteOptions(projectRoutes.getProjectById),
        preHandler: projectAction(projectRoutes.getProjectById, 'read'),
      },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const project = await getProjectById(request, id)

        if (project === null) {
          reply.code(404).send({
            message: projectMessages.notFound,
            error: 'PROJECT_NOT_FOUND',
          })
          return
        }

        reply.code(200).send({
          message: projectMessages.retrieved,
          data: project,
        })
      },
    )

    // PUT /api/v1/projects/:id — requires project:update (with ownership fallback)
    app.put(
      projectRoutes.updateProject.path,
      {
        ...createRouteOptions(projectRoutes.updateProject),
        preHandler: projectAction(projectRoutes.updateProject, 'update'),
      },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const project = await updateProject(request, id, request.body as UpdateProjectBody)

        if (project === null) {
          reply.code(404).send({
            message: projectMessages.notFound,
            error: 'PROJECT_NOT_FOUND',
          })
          return
        }

        reply.code(200).send({
          message: projectMessages.updated,
          data: project,
        })
      },
    )

    // DELETE /api/v1/projects/:id — requires project:delete (with ownership fallback)
    app.delete(
      projectRoutes.deleteProject.path,
      {
        ...createRouteOptions(projectRoutes.deleteProject),
        preHandler: projectAction(projectRoutes.deleteProject, 'delete'),
      },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const project = await deleteProject(request, id)

        if (project === null) {
          reply.code(404).send({
            message: projectMessages.notFound,
            error: 'PROJECT_NOT_FOUND',
          })
          return
        }

        reply.code(200).send({
          message: projectMessages.deleted,
        })
      },
    )

    // GET /api/v1/projects/:id/members — requires project:read (with ownership fallback)
    app.get(
      projectRoutes.getProjectMembers.path,
      {
        ...createRouteOptions(projectRoutes.getProjectMembers),
        preHandler: projectAction(projectRoutes.getProjectMembers, 'read'),
      },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const pagination = request.query as ProjectMemberQuery
        const result = await getProjectMembers(request, id, pagination)

        if (result === null) {
          reply.code(404).send({
            message: projectMessages.notFound,
            error: 'PROJECT_NOT_FOUND',
          })
          return
        }

        reply.code(200).send({
          message: projectMessages.membersRetrieved,
          data: result.members,
          total: result.total,
        })
      },
    )

    // POST /api/v1/projects/:id/members — requires project:manage-members
    // (project owner/admin roles, org owner/admin roles, or a custom org role)
    app.post(
      projectRoutes.addProjectMember.path,
      {
        ...createRouteOptions(projectRoutes.addProjectMember),
        preHandler: projectAction(projectRoutes.addProjectMember, 'manage-members'),
      },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const member = await addProjectMember(request, id, request.body as AddProjectMemberBody)

        reply.code(201).send({
          message: projectMessages.memberAdded,
          data: member,
        })
      },
    )

    // PUT /api/v1/projects/:id/members/:memberId — requires project:manage-members
    app.put(
      projectRoutes.updateProjectMember.path,
      {
        ...createRouteOptions(projectRoutes.updateProjectMember),
        preHandler: projectAction(projectRoutes.updateProjectMember, 'manage-members'),
      },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const memberId = getRouteParam(request, 'memberId')
        const member = await updateProjectMember(request, id, memberId, request.body as UpdateProjectMemberBody)

        reply.code(200).send({
          message: projectMessages.memberUpdated,
          data: member,
        })
      },
    )

    // DELETE /api/v1/projects/:id/members/:memberId — requires project:manage-members
    app.delete(
      projectRoutes.removeProjectMember.path,
      {
        ...createRouteOptions(projectRoutes.removeProjectMember),
        preHandler: projectAction(projectRoutes.removeProjectMember, 'manage-members'),
      },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const memberId = getRouteParam(request, 'memberId')
        await removeProjectMember(request, id, memberId)

        reply.code(200).send({
          message: projectMessages.memberRemoved,
        })
      },
    )

    // ---- Service keys ----------------------------------------------------
    //
    // Gated on `manage-members` rather than a new action: minting a
    // credential that acts as the project is granting access to the project,
    // and that permission is already held by exactly the right set (project
    // owner and admin). A separate action would widen the shared permission
    // vocabulary — and every picker built on it — for an identical grant.

    app.get(
      projectRoutes.getProjectServiceKeys.path,
      {
        ...createRouteOptions(projectRoutes.getProjectServiceKeys),
        preHandler: projectProtection(projectRoutes.getProjectServiceKeys, { 'service-key': ['read'] }),
      },
      async (request, reply) => {
        const { data, total } = await listProjectServiceKeys(getRouteParam(request, 'id'))

        reply.code(200).send({ data, total })
      },
    )

    app.post(
      projectRoutes.createProjectServiceKey.path,
      {
        ...createRouteOptions(projectRoutes.createProjectServiceKey),
        preHandler: projectProtection(projectRoutes.createProjectServiceKey, { 'service-key': ['create'] }),
      },
      async (request, reply) => {
        const project = request.project!
        const { key, data } = await createProjectServiceKey(
          request,
          { id: project.id, name: project.name, organizationId: project.organizationId },
          request.body as CreateProjectServiceKeyBody,
        )

        reply.code(201).send({ message: projectMessages.serviceKeyCreated, key, data })
      },
    )

    app.delete(
      projectRoutes.revokeProjectServiceKey.path,
      {
        ...createRouteOptions(projectRoutes.revokeProjectServiceKey),
        preHandler: projectProtection(projectRoutes.revokeProjectServiceKey, { 'service-key': ['delete'] }),
      },
      async (request, reply) => {
        const project = request.project!
        await revokeProjectServiceKey(
          request,
          { id: project.id, organizationId: project.organizationId },
          getRouteParam(request, 'keyId'),
        )

        reply.code(200).send({ message: projectMessages.serviceKeyRevoked })
      },
    )
  }
}
