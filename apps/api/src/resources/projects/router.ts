import type { CreateProjectBody, UpdateProjectBody } from '@template-monorepo-ts/shared'
import type { FastifyInstance } from 'fastify'
import { projectRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { createProject, deleteProject, getProjectById, getProjects, updateProject } from './business.js'
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
        const projects = await getProjects(request)

        reply.code(200).send({
          message: projectMessages.retrievedAll,
          data: projects,
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
  }
}
