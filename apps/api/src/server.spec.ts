import app from '~/app.js'
import * as dbModule from '~/database.js'
import { exitGracefully, handleExit, startServer } from '~/server.js'

const appListen = vi.spyOn(app, 'listen').mockImplementation(vi.fn())
const appLogError = vi.spyOn(app.log, 'error')
const appLogInfo = vi.spyOn(app.log, 'info')
const initDb = vi.spyOn(dbModule, 'initDb')
const processOn = vi.spyOn(process, 'on').mockImplementation(vi.fn())
const processExit = vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any)

describe('server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start application successfully', async () => {
    await startServer()

    expect(appListen).toHaveBeenCalledTimes(1)
  })

  it('should log an error if application failed to start', async () => {
    appListen.mockRejectedValueOnce(new Error('Error'))

    await startServer().catch((_err) => {})

    expect(appListen).toHaveBeenCalledTimes(1)
    expect(appLogError).toHaveBeenCalledTimes(1)
    expect(processExit).toHaveBeenCalledTimes(1)
  })

  it('should fail to init database', async () => {
    initDb.mockRejectedValueOnce(new Error('Error'))

    await startServer().catch((_err) => {})

    expect(appListen).toHaveBeenCalledTimes(1)
    expect(appLogError).toHaveBeenCalledTimes(1)
    expect(processExit).toHaveBeenCalledTimes(1)
  })

  it('should call process.on', () => {
    handleExit()

    expect(processOn).toHaveBeenCalledTimes(5)
  })

  it('should log on exit', async () => {
    await exitGracefully(new Error('Error'))

    expect(appLogError).toHaveBeenCalledTimes(1)
    expect(appLogError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(appLogInfo).toHaveBeenCalledTimes(3)
  })
})
