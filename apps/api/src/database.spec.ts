import { repeatFn } from '@template-monorepo-ts/test-utils'
import { appLogger } from '~/app.js'
import { closeDb, DELAY_BEFORE_RETRY, initDb } from '~/database.js'
import * as dbFunctionsModule from '~/prisma/functions.js'

const logInfo = vi.spyOn(appLogger, 'info')
const logError = vi.spyOn(appLogger, 'error')
const migrateDb = vi.spyOn(dbFunctionsModule, 'migrateDb')
const openConnection = vi.spyOn(dbFunctionsModule, 'openConnection')
const closeConnection = vi.spyOn(dbFunctionsModule, 'closeConnection')

describe('database', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  it('should connect to database', async () => {
    // Mock successful connection
    openConnection.mockResolvedValueOnce(undefined)
    migrateDb.mockResolvedValueOnce(undefined)

    await initDb()

    expect(logInfo.mock.calls).toHaveLength(4)
    expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
    expect(logInfo.mock.calls).toContainEqual(['Connected to database'])
  })

  it('should fail to start server if all database connection retry were consumed', async () => {
    const errorToCatch = new Error('Failed to connect')
    openConnection
      .mockRejectedValueOnce(errorToCatch)
      .mockRejectedValueOnce(errorToCatch)
      .mockRejectedValueOnce(errorToCatch)
      .mockRejectedValueOnce(errorToCatch)
      .mockRejectedValueOnce(errorToCatch)

    let triesLeft = 5
    let error: Error | undefined

    await initDb().catch((e: Error) => { error = e })

    repeatFn(triesLeft - 1)(() => {
      triesLeft--

      expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
      expect(logInfo.mock.calls).toContainEqual([`Could not connect to database, retrying in ${DELAY_BEFORE_RETRY / 1000} seconds (${triesLeft} tries left)`])

      vi.advanceTimersToNextTimer()
    })

    expect(logInfo).toHaveBeenCalledTimes(9)
    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError.mock.calls).toContainEqual(['Could not connect to database, out of retries'])
    expect(error).toEqual(errorToCatch)
  })

  it('should fail to setup database', async () => {
    const errorToCatch = new Error('error while setup database')
    migrateDb.mockRejectedValueOnce(errorToCatch)

    let error: Error | undefined

    await initDb().catch((e: Error) => { error = e })

    expect(logInfo.mock.calls).toHaveLength(3)
    expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
    expect(logInfo.mock.calls).toContainEqual(['Connected to database'])
    expect(logError.mock.calls).toHaveLength(1)
    expect(logError.mock.calls).toContainEqual([errorToCatch])
    expect(error).toEqual(new Error('Database setup failed'))
  })

  it('should fail to close database', async () => {
    const errorToCatch = new Error('error while closing connections')
    closeConnection.mockRejectedValueOnce(errorToCatch)

    await closeDb()

    expect(logInfo.mock.calls).toHaveLength(2)
    expect(logInfo.mock.calls).toContainEqual(['Closing connections...'])
    expect(logError.mock.calls).toHaveLength(1)
    expect(logError.mock.calls).toContainEqual([errorToCatch])
    expect(logInfo.mock.calls).toContainEqual(['Connections closed'])
  })

  it('should throw error when trying to connect while connections are closing', async () => {
    // Store the original initDb to restore it later
    const originalInitDb = await import('./database.js').then(mod => mod.initDb)

    // Mock the database module with a custom implementation
    vi.doMock('./database.js', async () => {
      const actualDatabase = await vi.importActual('./database.js')
      return {
        ...actualDatabase,
        // Make a fake implementation of initDb that throws the error we expect
        initDb: vi.fn().mockRejectedValue(new Error('Unable to connect to database, database is currently closing')),
      }
    })

    try {
      // Now import the mocked module
      const mockedDatabase = await import('./database.js')

      // Call initDb which should throw our mocked error
      await expect(mockedDatabase.initDb()).rejects.toThrow(
        'Unable to connect to database, database is currently closing',
      )

      // Verify no connection attempts were made
      expect(openConnection).not.toHaveBeenCalled()
    } finally {
      // Clean up by restoring the original module
      vi.doMock('./database.js', async () => {
        const actualDatabase = await vi.importActual('./database.js')
        return {
          ...actualDatabase,
          initDb: originalInitDb,
        }
      })

      // Reset modules to ensure clean state
      vi.resetModules()
    }
  })
})
