#!/usr/bin/env node
import { resolveConfig } from './config.js'

/**
 * MCP server entrypoint — dual-mode: stdio (local IDE) or HTTP (remote network).
 *
 * Mode is controlled by `TMTS_TRANSPORT` env var:
 * - `"stdio"` (default) — standard input/output for local AI clients
 * - `"http"` — Stateless Streamable HTTP via `Bun.serve` for remote AI agents
 */
async function main() {
  const config = resolveConfig()

  if (config.transport === 'http') {
    const { createRequestHandler } = await import('./http-server.js')

    const server = Bun.serve({
      port: config.http.port,
      hostname: config.http.host,
      fetch: createRequestHandler(config),
    })

    console.log(`[mcp-http] Listening on ${server.hostname}:${server.port}`)
    console.log(`[mcp-http] MCP endpoint: http://${server.hostname}:${server.port}/mcp`)
    console.log(`[mcp-http] Health check: http://${server.hostname}:${server.port}/healthz`)

    // Graceful shutdown
    const shutdown = () => {
      console.log('[mcp-http] Shutting down...')
      server.stop()
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } else {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js')
    const { createClient } = await import('./client.js')
    const { createServer } = await import('./server.js')

    const client = createClient(config)
    const server = createServer(client)
    const transport = new StdioServerTransport()
    await server.connect(transport)
  }
}

main()
