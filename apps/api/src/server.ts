import app from './app.js'
import { closeDb, initDb } from './database.js'
import { config } from './utils/config.js'

// The process.exit is mocked in tests, so this is safe
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

export function handleExit() {
  process.on('exit', exitGracefully)
  process.on('SIGINT', exitGracefully)
  process.on('SIGTERM', exitGracefully)
  process.on('uncaughtException', exitGracefully)
  process.on('unhandledRejection', exitGracefully)
}

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
