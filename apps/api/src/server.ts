import app from './app.js'
import { port } from './utils/env.js'

await startServer()
handleExit()

export async function startServer () {
  try {
    await app.listen({ host: '0.0.0.0', port: +port })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

export function handleExit () {
  process.on('exit', exitGracefully)
  process.on('SIGINT', exitGracefully)
  process.on('SIGTERM', exitGracefully)
  process.on('uncaughtException', exitGracefully)
}

export function exitGracefully (error: Error) {
  if (error instanceof Error) {
    app.log.error(error)
  }
  app.log.info('Exiting...')
  process.exit(1)
}
