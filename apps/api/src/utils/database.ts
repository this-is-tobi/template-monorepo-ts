import { setTimeout } from 'node:timers/promises'
import { appLogger } from '~/app.js'
import { closeConnection, openConnection } from '~/prisma/functions.js'
import { getNodeEnv } from '~/utils/functions.js'

/**
 * Base delay (ms) for the first retry — doubles on each subsequent attempt.
 */
const baseDelayDict = {
  production: 2_000,
  development: 500,
  test: 10,
}

/** Base delay for the current environment. */
export const BASE_DELAY = baseDelayDict[getNodeEnv()]

/** Maximum delay cap (ms) for exponential backoff. */
const MAX_DELAY = 30_000

/** Compute retry delay with exponential backoff, capped at MAX_DELAY. */
function getRetryDelay(attempt: number): number {
  return Math.min(BASE_DELAY * 2 ** attempt, MAX_DELAY)
}

/**
 * In-flight close promise — ensures concurrent `closeDb()` calls are
 * deduplicated (only one `closeConnection()` runs) and prevents new
 * connections via `initDb()` while shutdown is in progress.
 */
let closePromise: Promise<void> | undefined

/**
 * Initializes the database connection with retry mechanism.
 * Uses exponential backoff between attempts.
 *
 * @param triesLeft - Number of connection attempts remaining
 * @param attempt - Current attempt index (used for backoff calculation)
 */
export const initDb: (triesLeft?: number, attempt?: number) => Promise<void | undefined> = async (triesLeft = 5, attempt = 0) => {
  if (closePromise) {
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
    const delay = getRetryDelay(attempt)
    appLogger.warn(`Could not connect to database, retrying in ${(delay / 1000).toFixed(1)}s (${triesLeft} tries left)`)
    await setTimeout(delay)
    return initDb(triesLeft, attempt + 1)
  }
}

/**
 * Closes the database connection.
 * Concurrent calls are deduplicated — only one close operation runs.
 */
export function closeDb(): Promise<void> {
  if (closePromise) return closePromise
  closePromise = performClose()
  return closePromise
}

async function performClose(): Promise<void> {
  appLogger.info('Closing connections...')
  try {
    await closeConnection()
  } catch (error) {
    appLogger.error(error)
  } finally {
    appLogger.info('Connections closed')
  }
}

/**
 * Reset module state for testing.
 * @internal
 */
export function _resetForTesting(): void {
  closePromise = undefined
}
