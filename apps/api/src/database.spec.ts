import { PrismaClientInitializationError } from '@prisma/client/runtime/library'
import { repeatFn } from '@template-monorepo-ts/test-utils'
import app from '@/app.js'
import { initDb, closeDb, DELAY_BEFORE_RETRY } from '@/database.js'
import * as dbFunctionsModule from '@/prisma/functions.js'

const logInfo = vi.spyOn(app.log, 'info')
const logError = vi.spyOn(app.log, 'error')
const migrateDb = vi.spyOn(dbFunctionsModule, 'migrateDb')
const openConnection = vi.spyOn(dbFunctionsModule, 'openConnection')
const closeConnection = vi.spyOn(dbFunctionsModule, 'closeConnection')

describe('Database', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  it('Should connect to database', async () => {
    await initDb()

    expect(logInfo.mock.calls).toHaveLength(2)
    expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
    expect(logInfo.mock.calls).toContainEqual(['Connected to database'])
  })

  it('Should fail to start server if all database connection retry were consumed', async () => {
    const errorToCatch = new PrismaClientInitializationError('Failed to connect', '2.19.0', 'P1001')
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

  it('Should fail to setup database', async () => {
    const errorToCatch = new Error('error while setup database')
    migrateDb.mockRejectedValueOnce(errorToCatch)

    let error: Error | undefined

    await initDb().catch((e: Error) => { error = e })

    expect(logInfo.mock.calls).toHaveLength(2)
    expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
    expect(logInfo.mock.calls).toContainEqual(['Connected to database'])
    expect(logError.mock.calls).toHaveLength(1)
    expect(logError.mock.calls).toContainEqual([errorToCatch])
    expect(error).toEqual(new Error('Database setup failed'))
  })

  it('Should fail to close database', async () => {
    const errorToCatch = new Error('error while closing connections')
    closeConnection.mockRejectedValueOnce(errorToCatch)

    await closeDb()

    expect(logInfo.mock.calls).toHaveLength(2)
    expect(logInfo.mock.calls).toContainEqual(['Closing connections...'])
    expect(logError.mock.calls).toHaveLength(1)
    expect(logError.mock.calls).toContainEqual([errorToCatch])
    expect(logInfo.mock.calls).toContainEqual(['Connections closed'])
  })
})
