import { startServer, handleExit, exitGracefully } from '@/server.js'
import app from '@/app.js'
import * as dbModule from '@/database.js'

const appListen = vi.spyOn(app, 'listen').mockImplementation(vi.fn())
const appLogError = vi.spyOn(app.log, 'error')
const appLogInfo = vi.spyOn(app.log, 'info')
const initDb = vi.spyOn(dbModule, 'initDb')
const processOn = vi.spyOn(process, 'on').mockImplementation(vi.fn())
const processExit = vi.spyOn(process, 'exit').mockImplementation(vi.fn())

describe('Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Should start application successfully', async () => {
    await startServer()

    expect(appListen).toHaveBeenCalledTimes(1)
  })

  it('Should log an error if application failed to start', async () => {
    appListen.mockRejectedValueOnce(new Error())

    await startServer().catch(err => console.log(err))

    expect(appListen).toHaveBeenCalledTimes(1)
    expect(appLogError).toHaveBeenCalledTimes(1)
    expect(processExit).toHaveBeenCalledTimes(1)
  })

  it('Should fail to init database', async () => {
    initDb.mockRejectedValueOnce(new Error())

    await startServer().catch(err => console.log(err))

    expect(appListen).toHaveBeenCalledTimes(1)
    expect(appLogError).toHaveBeenCalledTimes(1)
    expect(processExit).toHaveBeenCalledTimes(1)
  })

  it('Should call process.on', () => {
    handleExit()

    expect(processOn).toHaveBeenCalledTimes(5)
  })

  it('Should log on exit', async () => {
    await exitGracefully(new Error())

    expect(appLogError).toHaveBeenCalledTimes(1)
    expect(appLogError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(appLogInfo).toHaveBeenCalledTimes(3)
  })
})
