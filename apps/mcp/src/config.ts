import type { AuthenticatedClientConfig } from '@template-monorepo-ts/shared'

/**
 * Transport mode for the MCP server.
 * - `stdio`  — standard input/output (local IDE integration)
 * - `http`   — Streamable HTTP (remote network access, requires auth)
 */
export type TransportMode = 'stdio' | 'http'

/**
 * HTTP transport configuration (used only when `transport` is `'http'`).
 */
export interface HttpTransportConfig {
  /** Listen host (default: `"0.0.0.0"`). */
  host: string
  /** Listen port (default: `3100`). */
  port: number
}

/**
 * MCP server configuration.
 */
export interface McpConfig extends AuthenticatedClientConfig {
  /** Transport mode — `"stdio"` (default) or `"http"`. */
  transport: TransportMode
  /** HTTP transport options (only when `transport` is `"http"`). */
  http: HttpTransportConfig
}

const DEFAULT_HTTP_PORT = 3100

/**
 * Resolve MCP server configuration from environment variables.
 *
 * Common variables:
 * - `TMTS_SERVER_URL` (required) — Base URL of the API server
 * - `TMTS_TOKEN` — Bearer token for session-based auth (stdio mode)
 * - `TMTS_API_KEY` — API key for key-based auth (stdio mode)
 * - `TMTS_TRANSPORT` — `"stdio"` (default) or `"http"`
 *
 * HTTP-mode variables:
 * - `TMTS_HTTP_HOST` — Listen host (default: `"0.0.0.0"`)
 * - `TMTS_HTTP_PORT` — Listen port (default: `3100`)
 *
 * @throws {Error} If `TMTS_SERVER_URL` is not set
 */
export function resolveConfig(): McpConfig {
  const serverUrl = process.env.TMTS_SERVER_URL

  if (!serverUrl) {
    throw new Error(
      'No server URL configured. Set the TMTS_SERVER_URL environment variable.\n'
      + '  Example: TMTS_SERVER_URL=http://localhost:8081',
    )
  }

  const transport = (process.env.TMTS_TRANSPORT ?? 'stdio') as TransportMode
  if (transport !== 'stdio' && transport !== 'http') {
    throw new Error(`Invalid transport "${transport}". Must be "stdio" or "http".`)
  }

  return {
    serverUrl,
    token: process.env.TMTS_TOKEN,
    apiKey: process.env.TMTS_API_KEY,
    transport,
    http: {
      host: process.env.TMTS_HTTP_HOST ?? '0.0.0.0',
      port: Number.parseInt(process.env.TMTS_HTTP_PORT ?? String(DEFAULT_HTTP_PORT), 10),
    },
  }
}
