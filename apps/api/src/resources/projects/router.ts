import type { FastifyInstance } from 'fastify'
import type { CreateProjectInput, UpdateProjectInput } from './business.js'
import { projectRoutes } from '@template-monorepo-ts/shared'
import { createRouteOptions, createZodValidationHandler } from '~/utils/index.js'
import { createProject, deleteProject, getProjectById, getProjects, updateProject } from './business.js'
import { projectMessages } from './constants.js'

export function getProjectRouter() {
  return async (app: FastifyInstance) => {
    // POST /api/v1/projects — any authenticated user
    app.post(
      projectRoutes.createProject.path,
      { ...createRouteOptions(projectRoutes.createProject), preHandler: [app.requireAuth, createZodValidationHandler(projectRoutes.createProject)] },
      async (request, reply) => {
        const project = await createProject(request, request.body as CreateProjectInput)

        reply.code(201).send({
          message: projectMessages.created,
          data: project,
        })
      },
    )

    // GET /api/v1/projects — authenticated
    app.get(
      projectRoutes.getProjects.path,
      { ...createRouteOptions(projectRoutes.getProjects), preHandler: [app.requireAuth, createZodValidationHandler(projectRoutes.getProjects)] },
      async (request, reply) => {
        const projects = await getProjects(request)

        reply.code(200).send({
          message: projectMessages.retrievedAll,
          data: projects,
        })
      },
    )

    // GET /api/v1/projects/:id — authenticated
    app.get(
      projectRoutes.getProjectById.path,
      { ...createRouteOptions(projectRoutes.getProjectById), preHandler: [app.requireAuth, createZodValidationHandler(projectRoutes.getProjectById)] },
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
        if (project === 'forbidden') {
          reply.code(403).send({
            message: projectMessages.forbidden,
            error: 'PROJECT_FORBIDDEN',
          })
          return
        }

        reply.code(200).send({
          message: projectMessages.retrieved,
          data: project,
        })
      },
    )

    // PUT /api/v1/projects/:id — authenticated
    app.put(
      projectRoutes.updateProject.path,
      { ...createRouteOptions(projectRoutes.updateProject), preHandler: [app.requireAuth, createZodValidationHandler(projectRoutes.updateProject)] },
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const project = await updateProject(request, id, request.body as UpdateProjectInput)

        if (project === null) {
          reply.code(404).send({
            message: projectMessages.notFound,
            error: 'PROJECT_NOT_FOUND',
          })
          return
        }
        if (project === 'forbidden') {
          reply.code(403).send({
            message: projectMessages.forbidden,
            error: 'PROJECT_FORBIDDEN',
          })
          return
        }

        reply.code(200).send({
          message: projectMessages.updated,
          data: project,
        })
      },
    )

    // DELETE /api/v1/projects/:id — any authenticated user (owner or admin)
    app.delete(
      projectRoutes.deleteProject.path,
      { ...createRouteOptions(projectRoutes.deleteProject), preHandler: [app.requireAuth, createZodValidationHandler(projectRoutes.deleteProject)] },
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
        if (project === 'forbidden') {
          reply.code(403).send({
            message: projectMessages.forbidden,
            error: 'PROJECT_FORBIDDEN',
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
