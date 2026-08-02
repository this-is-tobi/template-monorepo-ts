import type { RouteDefinition } from '../api-client/types.js'
import { apiPrefix } from '../api-client/utils.js'
import {
  AddProjectMemberSchema,
  CreateProjectSchema,
  CreateProjectServiceKeySchema,
  DeleteProjectSchema,
  GetProjectByIdSchema,
  GetProjectMembersSchema,
  GetProjectServiceKeysSchema,
  GetProjectsSchema,
  RemoveProjectMemberSchema,
  RevokeProjectServiceKeySchema,
  UpdateProjectMemberSchema,
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
    query: GetProjectsSchema.query,
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

  getProjectMembers: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/projects/:id/members` },
    summary: 'Get project members',
    description: 'List all members of a project.',
    tags: ['Projects'],
    params: GetProjectMembersSchema.params,
    query: GetProjectMembersSchema.query,
    responses: GetProjectMembersSchema.responses,
  },

  addProjectMember: {
    method: 'POST',
    get path() { return `${apiPrefix.v1}/projects/:id/members` },
    summary: 'Add project member',
    description: 'Add a member to a project.',
    tags: ['Projects'],
    params: AddProjectMemberSchema.params,
    body: AddProjectMemberSchema.body,
    responses: AddProjectMemberSchema.responses,
  },

  updateProjectMember: {
    method: 'PUT',
    get path() { return `${apiPrefix.v1}/projects/:id/members/:memberId` },
    summary: 'Update project member',
    description: 'Update a member role in a project.',
    tags: ['Projects'],
    params: UpdateProjectMemberSchema.params,
    body: UpdateProjectMemberSchema.body,
    responses: UpdateProjectMemberSchema.responses,
  },

  removeProjectMember: {
    method: 'DELETE',
    get path() { return `${apiPrefix.v1}/projects/:id/members/:memberId` },
    summary: 'Remove project member',
    description: 'Remove a member from a project.',
    tags: ['Projects'],
    params: RemoveProjectMemberSchema.params,
    responses: RemoveProjectMemberSchema.responses,
  },

  getProjectServiceKeys: {
    method: 'GET',
    get path() { return `${apiPrefix.v1}/projects/:id/service-keys` },
    summary: 'List project service keys',
    description: 'API keys owned by the project rather than by a user.',
    tags: ['Projects'],
    params: GetProjectServiceKeysSchema.params,
    responses: GetProjectServiceKeysSchema.responses,
  },

  createProjectServiceKey: {
    method: 'POST',
    get path() { return `${apiPrefix.v1}/projects/:id/service-keys` },
    summary: 'Create project service key',
    description: 'Mint an API key owned by the project. Scope is fixed to the project; the secret is returned once.',
    tags: ['Projects'],
    params: CreateProjectServiceKeySchema.params,
    body: CreateProjectServiceKeySchema.body,
    responses: CreateProjectServiceKeySchema.responses,
  },

  revokeProjectServiceKey: {
    method: 'DELETE',
    get path() { return `${apiPrefix.v1}/projects/:id/service-keys/:keyId` },
    summary: 'Revoke project service key',
    description: 'Permanently revoke a project service key.',
    tags: ['Projects'],
    params: RevokeProjectServiceKeySchema.params,
    responses: RevokeProjectServiceKeySchema.responses,
  },
} as const satisfies Record<string, RouteDefinition>
