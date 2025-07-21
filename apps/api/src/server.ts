import app from './app.js'
import { closeDb, initDb } from './database.js'
import { config } from './utils/config.js'

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
 * @param error - The error that triggered the shutdown, if any
 */
export async function exitGracefully(error: Error) {
  if (error instanceof Error) {
    app.log.error(error)
  }
  await closeDb()
  app.log.info('Exiting...')
  await app.close()

  if (process.env.NODE_ENV !== 'test') {
    process.exit(1)
  }
}

// Only run this in non-test environments
if (process.env.NODE_ENV !== 'test') {
  (async function main() {
    await startServer()
    handleExit()
  })()
}
