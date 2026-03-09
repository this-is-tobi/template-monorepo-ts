import type { McpConfig } from './config.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createAuthenticatedClient } from '@template-monorepo-ts/shared'
import { jsonError, validateAuth } from './auth.js'
import { createServer } from './server.js'

// ---------------------------------------------------------------------------
// Stateless request handler for Streamable HTTP MCP transport
//
// Uses WebStandardStreamableHTTPServerTransport (web-standard Request/Response).
//
// Following the MCP SDK multi-node deployment best practice:
//   sessionIdGenerator: undefined  → stateless mode
//   Each POST creates a fresh McpServer + transport, no sticky sessions.
//   Horizontally scalable behind any load balancer.
// ---------------------------------------------------------------------------

const MCP_PATH = '/mcp'
const HEALTH_PATH = '/healthz'

/**
 * Create the `fetch` request handler for the MCP HTTP server.
 *
 * Returns a pure web-standard `(req: Request) => Promise<Response>` handler,
 * suitable for `Bun.serve({ fetch })` or any web-standard runtime.
 *
 * Every `POST /mcp` request:
 * 1. Validates auth (Bearer token or API key) against the upstream API
 * 2. Creates a per-request `ApiClient` with the caller's credentials
 * 3. Creates a fresh `McpServer` + `WebStandardStreamableHTTPServerTransport`
 * 4. Delegates to the transport and returns the web-standard `Response`
 *
 * Stateless mode means:
 * - No in-memory session tracking — safe for multi-replica K8s deploys
 * - No sticky sessions required — works with any load balancer
 * - Each request is independent and self-contained
 *
 * `GET /healthz` is unauthenticated (K8s probes).
 */
export function createRequestHandler(config: McpConfig): (req: Request) => Promise<Response> {
  return req => handleRequest(req, config)
}

// ---------------------------------------------------------------------------
// Request routing
// ---------------------------------------------------------------------------

async function handleRequest(req: Request, config: McpConfig): Promise<Response> {
  const { pathname } = new URL(req.url)

  // Health probe — no auth required
  if (pathname === HEALTH_PATH && req.method === 'GET') {
    return Response.json({ status: 'OK' })
  }

  // Only MCP path is served
  if (pathname !== MCP_PATH) {
    return jsonError(404, 'Not found')
  }

  // Only POST is supported in stateless mode (no GET SSE, no DELETE sessions)
  if (req.method !== 'POST') {
    return jsonError(405, 'Method not allowed — stateless server only supports POST')
  }

  // --- Auth: validate credentials on every request ---
  const authResult = await validateAuth(req, config.serverUrl)
  if (!authResult) {
    return jsonError(401, 'Unauthorized — provide a valid Bearer token or x-api-key header')
  }

  // --- Stateless: create per-request McpServer + transport ---
  const userClient = createAuthenticatedClient({
    serverUrl: config.serverUrl,
    token: authResult.method === 'bearer' ? authResult.credential : undefined,
    apiKey: authResult.method === 'apiKey' ? authResult.credential : undefined,
  })

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode — no session tracking
  })

  const mcpServer = createServer(userClient)
  await mcpServer.connect(transport)

  return transport.handleRequest(req)
}
