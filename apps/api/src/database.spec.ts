import { vi, describe, it, expect, beforeEach } from 'vitest'
import { repeatFn } from '@template-monorepo-ts/test-utils'
import app from '@/app.js'
import * as databaseModule from '@/database.js'

const logInfo = vi.spyOn(app.log, 'info')
const openConnectionMock = vi.spyOn(databaseModule, 'openConnection')

describe('connect', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  it('Should connect to database', async () => {
    await databaseModule.initDb()

    expect(logInfo.mock.calls).toHaveLength(2)
    expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
    expect(logInfo.mock.calls).toContainEqual(['Connected to database'])
  })

  it.skip('Should fail to start server if all database connection retry were consumed', async () => {
    openConnectionMock.mockImplementation(() => { throw new Error('unexpected error') })

    let error: Error | undefined
    let triesLeft = 4

    await databaseModule.initDb().catch(e => { error = e })
    repeatFn(triesLeft)(() => {
      triesLeft--
      vi.advanceTimersToNextTimer()
    })

    expect(logInfo.mock.calls).toHaveLength(9)
    expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
    expect(logInfo.mock.calls).toContainEqual([`Could not connect to database, retrying in ${databaseModule.DELAY_BEFORE_RETRY / 1000} seconds (${triesLeft} tries left)`])
    expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
    expect(logInfo.mock.calls).toContainEqual([`Could not connect to database, retrying in ${databaseModule.DELAY_BEFORE_RETRY / 1000} seconds (${triesLeft} tries left)`])
    expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
    expect(logInfo.mock.calls).toContainEqual([`Could not connect to database, retrying in ${databaseModule.DELAY_BEFORE_RETRY / 1000} seconds (${triesLeft} tries left)`])
    expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
    expect(logInfo.mock.calls).toContainEqual([`Could not connect to database, retrying in ${databaseModule.DELAY_BEFORE_RETRY / 1000} seconds (${triesLeft} tries left)`])
    expect(logInfo.mock.calls).toContainEqual(['Trying to connect to database...'])
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toEqual('Could not connect to database, out of retries')
  })
})
