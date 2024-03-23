import type { User } from '@template-monorepo-ts/shared'
import app from './app.js'

export const DELAY_BEFORE_RETRY = process.env.NODE_ENV === 'production' ? 10_000 : 1_000
let closingConnections = false

export let db: User[]

export const openConnection = () => {
  db = []
}

export const closeConnection = () => {
  db = []
}

export const setupDb = async () => {
  db = []
}

export const initDb = async (triesLeft = 5) => {
  triesLeft--
  if (closingConnections) {
    throw new Error('Unable to connect to database')
  }
  try {
    app.log.info('Trying to connect to database...')
    openConnection()
    app.log.info('Connected to database')
  } catch (error) {
    if (!triesLeft) {
      throw new Error('Could not connect to database, out of retries')
    }
    app.log.info(`Could not connect to database, retrying in ${DELAY_BEFORE_RETRY / 1000} seconds (${triesLeft} tries left)`)
    setTimeout(async () => initDb(triesLeft), DELAY_BEFORE_RETRY)
    return
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
    if (db) {
      closeConnection()
    }
  } catch (error) {
    app.log.error(error)
  } finally {
    closingConnections = false
    app.log.info('Connections closed')
  }
}
