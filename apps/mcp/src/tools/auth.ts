import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '@template-monorepo-ts/shared'
import { formatError, formatSuccess } from '../utils.js'

/**
 * Register authentication tools on the MCP server.
 */
export function registerAuthTools(server: McpServer, client: ApiClient): void {
  server.registerTool(
    'whoami',
    {
      title: 'Who Am I',
      description: 'Retrieve the current authenticated user session and profile information.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const response = await client.auth.getSession()
        return formatSuccess(response.data)
      } catch (error) {
        return formatError(error)
      }
    },
  )
}
