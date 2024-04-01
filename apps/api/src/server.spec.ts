import { startServer, handleExit, exitGracefully } from '@/server.js'
import app from '@/app.js'

const appListen = vi.spyOn(app, 'listen')
const appLogError = vi.spyOn(app.log, 'error')
const appLogInfo = vi.spyOn(app.log, 'info')

describe('Server', () => {
  beforeAll(() => {
    process.exit = vi.fn()
    process.on = vi.fn()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Should start application successfully', async () => {
    await startServer().catch(err => console.warn(err))

    expect(appListen).toHaveBeenCalledTimes(1)
  })

  it('Should log an error if application failed to start', async () => {
    appListen.mockRejectedValueOnce(new Error())

    await startServer().catch(err => console.warn(err))

    expect(appListen).toHaveBeenCalledTimes(1)
    expect(appLogError).toHaveBeenCalledTimes(1)
  })

  it('Should call process.on', () => {
    const processOn = vi.spyOn(process, 'on')

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
