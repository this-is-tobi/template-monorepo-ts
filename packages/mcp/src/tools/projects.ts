import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '@template-monorepo-ts/shared'
import { GetProjectByIdSchema, ProjectSchema } from '@template-monorepo-ts/shared'
import { formatError, formatSuccess } from '../utils.js'

/** Shared input schema for create / update project (name + optional description). */
const projectBodySchema = ProjectSchema.pick({ name: true, description: true })

/** Shared input schema for identifying a project by UUID. */
const projectIdSchema = GetProjectByIdSchema.params

/**
 * Register project CRUD tools on the MCP server.
 */
export function registerProjectTools(server: McpServer, client: ApiClient): void {
  server.registerTool(
    'list-projects',
    {
      title: 'List Projects',
      description: 'Retrieve all projects accessible to the authenticated user.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const response = await client.projects.getAll()
        return formatSuccess(response.data)
      } catch (error) {
        return formatError(error)
      }
    },
  )

  server.registerTool(
    'get-project',
    {
      title: 'Get Project',
      description: 'Retrieve a single project by its unique identifier.',
      inputSchema: projectIdSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        const response = await client.projects.getById(id)
        return formatSuccess(response.data)
      } catch (error) {
        return formatError(error)
      }
    },
  )

  server.registerTool(
    'create-project',
    {
      title: 'Create Project',
      description: 'Create a new project. Requires a name (3–100 chars) and optional description (max 500 chars).',
      inputSchema: projectBodySchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ name, description }) => {
      try {
        const response = await client.projects.create({ name, description })
        return formatSuccess(response.data)
      } catch (error) {
        return formatError(error)
      }
    },
  )

  server.registerTool(
    'update-project',
    {
      title: 'Update Project',
      description: 'Update an existing project by its unique identifier.',
      inputSchema: projectIdSchema.extend(projectBodySchema.shape),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id, name, description }) => {
      try {
        const response = await client.projects.update(id, { name, description })
        return formatSuccess(response.data)
      } catch (error) {
        return formatError(error)
      }
    },
  )

  server.registerTool(
    'delete-project',
    {
      title: 'Delete Project',
      description: 'Permanently delete a project by its unique identifier. This action cannot be undone.',
      inputSchema: projectIdSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      try {
        const response = await client.projects.delete(id)
        return formatSuccess(response.data)
      } catch (error) {
        return formatError(error)
      }
    },
  )
}
