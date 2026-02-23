import app from './app.js'
import { closeDb, initDb } from './database.js'
import { config } from './utils/config.js'
import { shutdownOtel } from './utils/otel.js'

/**
 * Starts the server by initializing the database and then listening for connections
 * Will exit the process if initialization or listening fails, except in test environment
 */
export async function startServer() {
  try {
    await initDb()
  } catch (error) {
    app.log.error(error)
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1)
    }
  }

  try {
    await app.listen({ host: '0.0.0.0', port: config.api.port })
  } catch (error) {
    app.log.error(error)
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1)
    }
  }
}

/**
 * Sets up event handlers for graceful application shutdown
 * Registers handlers for various termination signals and unexpected errors
 */
export function handleExit() {
  process.on('exit', exitGracefully)
  process.on('SIGINT', exitGracefully)
  process.on('SIGTERM', exitGracefully)
  process.on('uncaughtException', exitGracefully)
  process.on('unhandledRejection', exitGracefully)
}

/**
 * Performs graceful shutdown of the application
 * Logs errors, closes database connections, and shuts down the server
 *
 * @param error - The error or signal that triggered the shutdown
 */
export async function exitGracefully(error: Error | string | number | unknown) {
  if (error instanceof Error) {
    app.log.error(error)
  }
  await closeDb()
  app.log.info('Exiting...')
  await app.close()
  await shutdownOtel()

  if (process.env.NODE_ENV !== 'test') {
    const exitCode = error instanceof Error ? 1 : 0
    process.exit(exitCode)
  }
}

// Only run this in non-test environments
if (process.env.NODE_ENV !== 'test') {
  (async function main() {
    await startServer()
    handleExit()
  })()
}
