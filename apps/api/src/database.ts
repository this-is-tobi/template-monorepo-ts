import { setTimeout } from 'timers/promises'
import app from '@/app.js'
import { openConnection, closeConnection, migrateDb } from '@/prisma/functions.js'
import { getNodeEnv } from '@/utils/functions.ts'

const delayDict = {
  production: 10_000,
  development: 1_000,
  test: 10,
}

export const DELAY_BEFORE_RETRY = delayDict[getNodeEnv()]
let closingConnections = false

export const setupDb = async () => {
  await migrateDb()
}

export const initDb: (triesLeft?: number) => Promise<void | undefined> = async (triesLeft = 5) => {
  if (closingConnections) {
    throw new Error('Unable to connect to database')
  }
  triesLeft--

  try {
    app.log.info('Trying to connect to database...')
    await openConnection()
    app.log.info('Connected to database')
  } catch (error) {
    if (!triesLeft) {
      app.log.error('Could not connect to database, out of retries')
      throw error
    }
    app.log.info(`Could not connect to database, retrying in ${DELAY_BEFORE_RETRY / 1000} seconds (${triesLeft} tries left)`)
    await setTimeout(DELAY_BEFORE_RETRY)
    return initDb(triesLeft)
  }
  try {
    await setupDb()
  } catch (error) {
    app.log.error(error)
    throw new Error('Database setup failed')
  }
}

export const closeDb = async () => {
  closingConnections = true
  app.log.info('Closing connections...')
  try {
    await closeConnection()
  } catch (error) {
    app.log.error(error)
  } finally {
    closingConnections = false
    app.log.info('Connections closed')
  }
}
