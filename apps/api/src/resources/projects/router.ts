import type { AddProjectMemberBody, CreateProjectBody, ProjectQuery, UpdateProjectBody, UpdateProjectMemberBody } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { projectRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { addProjectMember, createProject, deleteProject, getProjectById, getProjectMembers, getProjects, removeProjectMember, updateProject, updateProjectMember } from './business.js'
import { projectMessages } from './constants.js'
import { getProjectByIdQuery } from './queries.js'

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

    // GET /api/v1/projects — requires project:read permission
    app.get(
      projectRoutes.getProjects.path,
      { ...createRouteOptions(projectRoutes.getProjects), preHandler: [app.requireAuth, createZodValidationHandler(projectRoutes.getProjects), app.requirePermission({ project: ['read'] })] },
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
          app.requirePermission({
            permissions: { project: ['read'] },
            getOwnerId: async (req) => {
              const { id } = req.params as { id: string }
              return (await getProjectByIdQuery(id))?.ownerId
            },
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
          app.requirePermission({
            permissions: { project: ['update'] },
            getOwnerId: async (req) => {
              const { id } = req.params as { id: string }
              return (await getProjectByIdQuery(id))?.ownerId
            },
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
          app.requirePermission({
            permissions: { project: ['delete'] },
            getOwnerId: async (req) => {
              const { id } = req.params as { id: string }
              return (await getProjectByIdQuery(id))?.ownerId
            },
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
          app.requirePermission({
            permissions: { project: ['read'] },
            getOwnerId: async (req) => {
              const { id } = req.params as { id: string }
              return (await getProjectByIdQuery(id))?.ownerId
            },
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
          app.requirePermission({
            permissions: { project: ['update'] },
            getOwnerId: async (req) => {
              const { id } = req.params as { id: string }
              return (await getProjectByIdQuery(id))?.ownerId
            },
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
          app.requirePermission({
            permissions: { project: ['update'] },
            getOwnerId: async (req) => {
              const { id } = req.params as { id: string }
              return (await getProjectByIdQuery(id))?.ownerId
            },
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
          app.requirePermission({
            permissions: { project: ['update'] },
            getOwnerId: async (req) => {
              const { id } = req.params as { id: string }
              return (await getProjectByIdQuery(id))?.ownerId
            },
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
