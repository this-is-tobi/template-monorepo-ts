import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import {
  CreateProjectSchema,
  DeleteProjectSchema,
  GetProjectByIdSchema,
  GetProjectsSchema,
  ProjectSchema,
  UpdateProjectSchema,
} from '../schemas/index.js'

/**
 * Project API route definitions
 */
export const projectRoutes = {
  createProject: {
    method: 'POST',
    path: `${apiPrefix.v1}/projects`,
    summary: 'Create project',
    description: 'Create a new project. Requires authentication.',
    tags: ['Projects'],
    body: ProjectSchema.pick({ name: true, description: true }),
    responses: CreateProjectSchema.responses,
  },

  getProjects: {
    method: 'GET',
    path: `${apiPrefix.v1}/projects`,
    summary: 'Get projects',
    description: 'Retrieve all projects.',
    tags: ['Projects'],
    responses: GetProjectsSchema.responses,
  },

  getProjectById: {
    method: 'GET',
    path: `${apiPrefix.v1}/projects/:id`,
    summary: 'Get project',
    description: 'Retrieve a project by id.',
    tags: ['Projects'],
    params: GetProjectByIdSchema.params,
    responses: GetProjectByIdSchema.responses,
  },

  updateProject: {
    method: 'PUT',
    path: `${apiPrefix.v1}/projects/:id`,
    summary: 'Update project',
    description: 'Update a project by id.',
    tags: ['Projects'],
    params: UpdateProjectSchema.params,
    body: ProjectSchema.pick({ name: true, description: true }),
    responses: UpdateProjectSchema.responses,
  },

  deleteProject: {
    method: 'DELETE',
    path: `${apiPrefix.v1}/projects/:id`,
    summary: 'Delete project',
    description: 'Delete a project by id.',
    tags: ['Projects'],
    params: DeleteProjectSchema.params,
    responses: DeleteProjectSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
