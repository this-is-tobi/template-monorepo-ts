import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import {
  CreateProjectSchema,
  DeleteProjectSchema,
  GetProjectByIdSchema,
  GetProjectsSchema,
  UpdateProjectSchema,
} from '../schemas/index.js'

/**
 * Project API route definitions
 */
export const projectRoutes = {
  createProject: {
    method: 'POST',
    get path() { return `${apiPrefix.v1}/projects` },
    summary: 'Create project',
    description: 'Create a new project. Requires authentication.',
    tags: ['Projects'],
    body: CreateProjectSchema.body,
    responses: CreateProjectSchema.responses,
  },

  getProjects: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/projects` },
    summary: 'Get projects',
    description: 'Retrieve all projects.',
    tags: ['Projects'],
    responses: GetProjectsSchema.responses,
  },

  getProjectById: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/projects/:id` },
    summary: 'Get project',
    description: 'Retrieve a project by id.',
    tags: ['Projects'],
    params: GetProjectByIdSchema.params,
    responses: GetProjectByIdSchema.responses,
  },

  updateProject: {
    method: 'PUT',
    get path() { return `${apiPrefix.v1}/projects/:id` },
    summary: 'Update project',
    description: 'Update a project by id.',
    tags: ['Projects'],
    params: UpdateProjectSchema.params,
    body: UpdateProjectSchema.body,
    responses: UpdateProjectSchema.responses,
  },

  deleteProject: {
    method: 'DELETE',
    get path() { return `${apiPrefix.v1}/projects/:id` },
    summary: 'Delete project',
    description: 'Delete a project by id.',
    tags: ['Projects'],
    params: DeleteProjectSchema.params,
    responses: DeleteProjectSchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
