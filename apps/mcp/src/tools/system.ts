import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '@template-monorepo-ts/shared'
import { formatError, formatSuccess } from '../utils.js'

/**
 * Register system health and version tools on the MCP server.
 */
export function registerSystemTools(server: McpServer, client: ApiClient): void {
  server.registerTool(
    'get-version',
    {
      title: 'Get API Version',
      description: 'Retrieve the API server version.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const response = await client.system.getVersion()
        return formatSuccess(response.data)
      } catch (error) {
        return formatError(error)
      }
    },
  )

  server.registerTool(
    'get-health',
    {
      title: 'Get API Health',
      description: 'Check the API server health status. Returns OK if the server process is running.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const response = await client.system.getHealth()
        return formatSuccess(response.data)
      } catch (error) {
        return formatError(error)
      }
    },
  )

  server.registerTool(
    'get-ready',
    {
      title: 'Get API Readiness',
      description: 'Check whether the API server is ready to accept traffic (database connected, migrations applied).',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const response = await client.system.getReady()
        return formatSuccess(response.data)
      } catch (error) {
        return formatError(error)
      }
    },
  )

  server.registerTool(
    'get-live',
    {
      title: 'Get API Liveness',
      description: 'Check whether the API server process is alive.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const response = await client.system.getLive()
        return formatSuccess(response.data)
      } catch (error) {
        return formatError(error)
      }
    },
  )
}
