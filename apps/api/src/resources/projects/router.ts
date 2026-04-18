import type { AddProjectMemberBody, CreateProjectBody, ProjectQuery, UpdateProjectBody, UpdateProjectMemberBody } from '@template-monorepo-ts/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { Project } from '~/generated/prisma/client.js'
import { projectRoutes } from '@template-monorepo-ts/shared'
import { createProtection, createRouteOptions, getRouteParam } from '~/utils/index.js'
import { addProjectMember, createProject, deleteProject, getProjectById, getProjectMembers, getProjects, removeProjectMember, updateProject, updateProjectMember } from './business.js'
import { projectMessages } from './constants.js'
import { getProjectByIdWithOwnerQuery, getProjectMemberRoleQuery } from './queries.js'

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
      action: 'create' | 'read' | 'update' | 'delete',
    ) => protect.permission(
      route,
      {
        permissions: { project: [action] },
        getProjectId,
        getOrganizationId,
        getOwnerId,
        getProjectMemberRole,
      },
      [preloadProject],
    )

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
          ...(total !== undefined ? { total } : {}),
        })
      },
    )

    // GET /api/v1/projects/:id — requires project:read (with ownership fallback)
    app.get(
      projectRoutes.getProjectById.path,
      {
        ...createRouteOptions(projectRoutes.getProjectById),
        preHandler: projectProtection(projectRoutes.getProjectById, 'read'),
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
        preHandler: projectProtection(projectRoutes.updateProject, 'update'),
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
        preHandler: projectProtection(projectRoutes.deleteProject, 'delete'),
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
        preHandler: projectProtection(projectRoutes.getProjectMembers, 'read'),
      },
      async (request, reply) => {
        const id = getRouteParam(request, 'id')
        const result = await getProjectMembers(request, id)

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
        })
      },
    )

    // POST /api/v1/projects/:id/members — requires project:update (with ownership fallback)
    app.post(
      projectRoutes.addProjectMember.path,
      {
        ...createRouteOptions(projectRoutes.addProjectMember),
        preHandler: projectProtection(projectRoutes.addProjectMember, 'update'),
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

    // PUT /api/v1/projects/:id/members/:memberId — requires project:update (with ownership fallback)
    app.put(
      projectRoutes.updateProjectMember.path,
      {
        ...createRouteOptions(projectRoutes.updateProjectMember),
        preHandler: projectProtection(projectRoutes.updateProjectMember, 'update'),
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

    // DELETE /api/v1/projects/:id/members/:memberId — requires project:update (with ownership fallback)
    app.delete(
      projectRoutes.removeProjectMember.path,
      {
        ...createRouteOptions(projectRoutes.removeProjectMember),
        preHandler: projectProtection(projectRoutes.removeProjectMember, 'update'),
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
  }
}
