#!/usr/bin/env node
import { createLogger } from '@template-monorepo-ts/logger'
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

  // In stdio mode, stdout is the JSON-RPC wire — logs MUST go to stderr.
  // In HTTP mode, stdout is safe for logging.
  const logger = createLogger({
    name: 'mcp',
    destination: config.transport === 'stdio' ? 'stderr' : 'stdout',
    otel: false,
  })

  if (config.transport === 'http') {
    const { createRequestHandler } = await import('./http-server.js')

    const server = Bun.serve({
      port: config.http.port,
      hostname: config.http.host,
      fetch: createRequestHandler(config),
    })

    logger.info(`Listening on ${server.hostname}:${server.port}`)
    logger.info(`MCP endpoint: http://${server.hostname}:${server.port}/mcp`)
    logger.info(`Health check: http://${server.hostname}:${server.port}/healthz`)

    // Graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down...')
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
