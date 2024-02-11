import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest'
import app from './app.js'
import { startServer, handleExit, exitGracefully } from './server.js'

vi.mock('./utils/logger.js')

describe('Server', () => {
  beforeAll(() => {
    process.exit = vi.fn()
    process.on = vi.fn()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Should start application successfully', async () => {
    const appListen = vi.spyOn(app, 'listen')

    await startServer().catch(err => console.warn(err))

    expect(appListen.mock.calls).toHaveLength(1)
  })

  it('Should log an error if application failed to start', async () => {
    const appListen = vi.spyOn(app, 'listen')
    const appLogError = vi.spyOn(app.log, 'error')
    appListen.mockRejectedValueOnce(new Error())

    await startServer().catch(err => console.warn(err))

    expect(appListen.mock.calls).toHaveLength(1)
    expect(appLogError.mock.calls).toHaveLength(1)
  })

  it('Should call process.on', () => {
    const processOn = vi.spyOn(process, 'on')

    handleExit()

    expect(processOn.mock.calls).toHaveLength(4)
  })

  it('Should log on exit', async () => {
    const appLogInfo = vi.spyOn(app.log, 'info')
    const appLogError = vi.spyOn(app.log, 'error')

    exitGracefully(new Error())

    expect(appLogError.mock.calls).toHaveLength(1)
    expect(appLogError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(appLogInfo.mock.calls).toHaveLength(1)
  })
})
