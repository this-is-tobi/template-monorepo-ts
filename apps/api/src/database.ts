import { setTimeout } from 'node:timers/promises'
import { appLogger } from '~/app.js'
import { closeConnection, migrateDb, openConnection } from '~/prisma/functions.js'
import { getNodeEnv } from '~/utils/functions.js'

/**
 * Delay durations (in milliseconds) for retrying database connections
 * Different values for different environments
 */
const delayDict = {
  production: 10_000,
  development: 1_000,
  test: 10,
}

/**
 * Delay before retrying a database connection
 * Value depends on the current environment
 */
export const DELAY_BEFORE_RETRY = delayDict[getNodeEnv()]

/**
 * Flag to prevent connecting while connections are being closed
 */
let closingConnections = false

/**
 * Sets up the database by running migrations
 */
export async function setupDb() {
  await migrateDb()
}

/**
 * Initializes the database connection with retry mechanism
 * Attempts to connect to the database and run setup
 *
 * @param triesLeft - Number of connection attempts remaining
 * @returns A Promise that resolves when the connection is established
 */
export const initDb: (triesLeft?: number) => Promise<void | undefined> = async (triesLeft = 5) => {
  if (closingConnections) {
    throw new Error('Unable to connect to database, database is currently closing')
  }
  triesLeft--

  try {
    appLogger.info('Trying to connect to database...')
    await openConnection()
    appLogger.info('Connected to database')
  } catch (error) {
    if (!triesLeft) {
      appLogger.error('Could not connect to database, out of retries')
      throw error
    }
    appLogger.info(`Could not connect to database, retrying in ${DELAY_BEFORE_RETRY / 1000} seconds (${triesLeft} tries left)`)
    await setTimeout(DELAY_BEFORE_RETRY)
    return initDb(triesLeft)
  }
  try {
    appLogger.info('Setup database...')
    await setupDb()
    appLogger.info('Setup database successfully')
  } catch (error) {
    appLogger.error(error)
    throw new Error('Database setup failed')
  }
}

/**
 * Closes the database connection
 * Sets a flag to prevent new connections during shutdown
 */
export async function closeDb() {
  closingConnections = true
  appLogger.info('Closing connections...')
  try {
    await closeConnection()
  } catch (error) {
    appLogger.error(error)
  } finally {
    closingConnections = false
    appLogger.info('Connections closed')
  }
}
