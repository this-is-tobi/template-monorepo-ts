import type { ApiClient } from '@template-monorepo-ts/shared'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerAuthTools, registerProjectTools, registerSystemTools } from './tools/index.js'

/**
 * Create and configure an MCP server with all tools registered.
 *
 * @param client - Authenticated API client used by all tools
 * @returns Configured MCP server ready to connect to a transport
 */
export function createServer(client: ApiClient): McpServer {
  const server = new McpServer({
    name: 'template-monorepo-ts',
    version: '1.0.0',
  })

  registerProjectTools(server, client)
  registerAuthTools(server, client)
  registerSystemTools(server, client)

  return server
}
