import { PrismaClientInitializationError } from '@prisma/client/runtime/library'
import { repeatFn } from '@template-monorepo-ts/test-utils'
import { db } from '@/prisma/__mocks__/clients.js'
import app from '@/app.js'
import { initDb, DELAY_BEFORE_RETRY } from '@/database.ts'

const logInfo = vi.spyOn(app.log, 'info')
const logError = vi.spyOn(app.log, 'error')

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
    db.$connect.mockRejectedValue(errorToCatch)

    let triesLeft = 5
    let error: Error | undefined

    await initDb().catch(e => { error = e })

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
})
