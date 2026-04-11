import type { AddProjectMemberBody, CreateProjectBody, ProjectQuery, UpdateProjectBody, UpdateProjectMemberBody } from '@template-monorepo-ts/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { Project } from '~/generated/prisma/client.js'
import { projectRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { addProjectMember, createProject, deleteProject, getProjectById, getProjectMembers, getProjects, removeProjectMember, updateProject, updateProjectMember } from './business.js'
import { projectMessages } from './constants.js'
import { getProjectByIdQuery, getProjectMemberRoleQuery } from './queries.js'

// ---- Fastify augmentation for preloaded project ----------------------------
declare module 'fastify' {
  interface FastifyRequest {
    /** Preloaded project for `:id` routes — avoids repeated DB lookups. */
    project?: Project | null
  }
}

/** Extract `:id` route param — used for API key project-scope enforcement. */
const getProjectId = (req: FastifyRequest) => (req.params as { id: string }).id

/** Read the preloaded project's organization ID (O(0) DB). */
const getOrganizationId = (req: FastifyRequest) => req.project?.organizationId ?? undefined

/** Read the preloaded project's owner ID (O(0) DB). */
const getOwnerId = (req: FastifyRequest) => req.project?.ownerId

/** Reads the user's project-member role (1 DB query, via composite unique index). */
async function getProjectMemberRole(req: FastifyRequest) {
  const { id } = req.params as { id: string }
  return (await getProjectMemberRoleQuery(id, req.session!.user.id)) ?? undefined
}

/**
 * PreHandler — loads the project by `:id` and stashes it on `req.project`.
 * Must run after `requireAuth` so that `req.session` is available.
 */
async function preloadProject(req: FastifyRequest) {
  const { id } = req.params as { id: string }
  req.project = await getProjectByIdQuery(id)
}

/** Creates the project router plugin for Fastify. */
export function getProjectRouter() {
  return async (app: FastifyInstance) => {
    // POST /api/v1/projects — requires project:create permission
    app.post(
      projectRoutes.createProject.path,
      { ...createRouteOptions(projectRoutes.createProject), preHandler: [app.requireAuth, createZodValidationHandler(projectRoutes.createProject), app.requirePermission({ project: ['create'] })] },
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
      { ...createRouteOptions(projectRoutes.getProjects), preHandler: [app.requireAuth, createZodValidationHandler(projectRoutes.getProjects)] },
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
        preHandler: [
          app.requireAuth,
          createZodValidationHandler(projectRoutes.getProjectById),
          preloadProject,
          app.requirePermission({
            permissions: { project: ['read'] },
            getProjectId,
            getOrganizationId,
            getOwnerId,
            getProjectMemberRole,
          }),
        ],
      },
      async (request, reply) => {
        const { id } = request.params as { id: string }
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
        preHandler: [
          app.requireAuth,
          createZodValidationHandler(projectRoutes.updateProject),
          preloadProject,
          app.requirePermission({
            permissions: { project: ['update'] },
            getProjectId,
            getOrganizationId,
            getOwnerId,
            getProjectMemberRole,
          }),
        ],
      },
      async (request, reply) => {
        const { id } = request.params as { id: string }
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
        preHandler: [
          app.requireAuth,
          createZodValidationHandler(projectRoutes.deleteProject),
          preloadProject,
          app.requirePermission({
            permissions: { project: ['delete'] },
            getProjectId,
            getOrganizationId,
            getOwnerId,
            getProjectMemberRole,
          }),
        ],
      },
      async (request, reply) => {
        const { id } = request.params as { id: string }
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
        preHandler: [
          app.requireAuth,
          createZodValidationHandler(projectRoutes.getProjectMembers),
          preloadProject,
          app.requirePermission({
            permissions: { project: ['read'] },
            getProjectId,
            getOrganizationId,
            getOwnerId,
            getProjectMemberRole,
          }),
        ],
      },
      async (request, reply) => {
        const { id } = request.params as { id: string }
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
        preHandler: [
          app.requireAuth,
          createZodValidationHandler(projectRoutes.addProjectMember),
          preloadProject,
          app.requirePermission({
            permissions: { project: ['update'] },
            getProjectId,
            getOrganizationId,
            getOwnerId,
            getProjectMemberRole,
          }),
        ],
      },
      async (request, reply) => {
        const { id } = request.params as { id: string }
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
        preHandler: [
          app.requireAuth,
          createZodValidationHandler(projectRoutes.updateProjectMember),
          preloadProject,
          app.requirePermission({
            permissions: { project: ['update'] },
            getProjectId,
            getOrganizationId,
            getOwnerId,
            getProjectMemberRole,
          }),
        ],
      },
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const { memberId } = request.params as { memberId: string }
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
        preHandler: [
          app.requireAuth,
          createZodValidationHandler(projectRoutes.removeProjectMember),
          preloadProject,
          app.requirePermission({
            permissions: { project: ['update'] },
            getProjectId,
            getOrganizationId,
            getOwnerId,
            getProjectMemberRole,
          }),
        ],
      },
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const { memberId } = request.params as { memberId: string }
        await removeProjectMember(request, id, memberId)

        reply.code(200).send({
          message: projectMessages.memberRemoved,
        })
      },
    )
  }
}
