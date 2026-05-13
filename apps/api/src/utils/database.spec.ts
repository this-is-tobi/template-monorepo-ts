import { repeatFn } from '@template-monorepo-ts/test-utils'
import { appLogger } from '~/app.js'
import * as dbFunctionsModule from '~/prisma/functions.js'
import { _resetForTesting, closeDb, initDb } from '~/utils/database.js'

const logInfo = vi.spyOn(appLogger, 'info')
const logWarn = vi.spyOn(appLogger, 'warn')
const logError = vi.spyOn(appLogger, 'error')
const openConnection = vi.spyOn(dbFunctionsModule, 'openConnection')
const closeConnection = vi.spyOn(dbFunctionsModule, 'closeConnection')

describe('database', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
    _resetForTesting()
  })

  it('should connect to database', async () => {
    // Mock successful connection
    openConnection.mockResolvedValueOnce(undefined)

    await initDb()

    expect(logInfo.mock.calls).toHaveLength(2)
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
      expect(logWarn.mock.calls).toContainEqual([expect.stringContaining(`(${triesLeft} tries left)`)])

      vi.advanceTimersToNextTimer()
    })

    expect(logInfo).toHaveBeenCalledTimes(5)
    expect(logWarn).toHaveBeenCalledTimes(4)
    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError.mock.calls).toContainEqual(['Could not connect to database, out of retries'])
    expect(error).toEqual(errorToCatch)
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
    // Make closeConnection hang until we resolve it
    let resolveClose!: () => void
    closeConnection.mockReturnValue(new Promise<void>((r) => { resolveClose = r }))

    // Start closing (don't await yet)
    const closing = closeDb()

    // Try to init while closing — should throw
    await expect(initDb()).rejects.toThrow(
      'Unable to connect to database, database is currently closing',
    )

    // Verify no connection attempts were made
    expect(openConnection).not.toHaveBeenCalled()

    // Let close finish
    resolveClose()
    await closing
  })

  it('should deduplicate concurrent closeDb calls', async () => {
    closeConnection.mockResolvedValueOnce(undefined)

    const p1 = closeDb()
    const p2 = closeDb()

    expect(p1).toBe(p2)
    await p1

    expect(closeConnection).toHaveBeenCalledTimes(1)
  })
})
