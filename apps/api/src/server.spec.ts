import app from '~/app.js'
import * as dbModule from '~/database.js'
import { exitGracefully, handleExit, startServer } from '~/server.js'

// Setup spies after mocking
const appListen = vi.spyOn(app, 'listen').mockImplementation(async () => app)
const appLogError = vi.spyOn(app.log, 'error').mockImplementation(vi.fn())
const appLogInfo = vi.spyOn(app.log, 'info').mockImplementation(vi.fn())
const appClose = vi.spyOn(app, 'close').mockResolvedValue(undefined)
const initDb = vi.spyOn(dbModule, 'initDb').mockResolvedValue(undefined)
const closeDb = vi.spyOn(dbModule, 'closeDb').mockResolvedValue(undefined)
const processOn = vi.spyOn(process, 'on').mockImplementation(vi.fn())
const processExit = vi.spyOn(process, 'exit')

describe('server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start application successfully', async () => {
    await startServer()

    expect(appListen).toHaveBeenCalledTimes(1)
  })

  it('should log an error if application failed to start', async () => {
    // Reset mocks to ensure we can correctly verify calls
    appLogError.mockReset()
    processExit.mockReset()

    // Make sure initDb succeeds
    initDb.mockResolvedValueOnce(undefined)

    // Make listen fail
    appListen.mockRejectedValueOnce(new Error('Error'))

    // Save the current NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV

    // Force NODE_ENV to a non-test value to ensure process.exit is called
    process.env.NODE_ENV = 'development'

    await startServer().catch(() => {})

    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv

    expect(appListen).toHaveBeenCalled()
    expect(appLogError).toHaveBeenCalled()
    expect(processExit).toHaveBeenCalled()
  })

  it('should fail to init database', async () => {
    // Reset mocks to ensure we can correctly verify calls
    appListen.mockReset()
    appLogError.mockReset()
    processExit.mockReset()

    // Mock the initDb function to throw an error
    initDb.mockRejectedValueOnce(new Error('Database Error'))

    // Save the current NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV

    // Force NODE_ENV to a non-test value to ensure process.exit is called
    process.env.NODE_ENV = 'development'

    await startServer().catch(() => {})

    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv

    // Expect listen not to be called because the database initialization failed
    expect(appListen).not.toHaveBeenCalled()
    expect(appLogError).toHaveBeenCalled()
    expect(processExit).toHaveBeenCalled()
  })

  it('should call process.on', () => {
    handleExit()

    expect(processOn).toHaveBeenCalledTimes(5)
  })

  // This test now works since we've properly mocked process.exit
  it('should log on exit', async () => {
    // Reset mocks to ensure we can correctly verify calls
    appLogError.mockReset()
    appLogInfo.mockReset()
    closeDb.mockReset()
    appClose.mockReset()
    processExit.mockReset()

    // Create an error to pass to exitGracefully
    const testError = new Error('Test error')

    await exitGracefully(testError)

    // Verify that the proper logging and cleanup functions were called
    expect(appLogError).toHaveBeenCalledWith(testError)
    expect(closeDb).toHaveBeenCalled()
    expect(appLogInfo).toHaveBeenCalledWith('Exiting...')
    expect(appClose).toHaveBeenCalled()

    // process.exit should not be called in test environment
    expect(processExit).not.toHaveBeenCalled()
  })

  it('should handle non-Error objects passed to exitGracefully', async () => {
    // Reset mocks to ensure we can correctly verify calls
    appLogError.mockReset()
    appLogInfo.mockReset()
    closeDb.mockReset()
    appClose.mockReset()

    // Ensure NODE_ENV is 'test' to prevent the error from being thrown
    process.env.NODE_ENV = 'test'

    // Pass a non-Error object
    await exitGracefully('Not an error' as unknown as Error)

    // Error log should not be called since it's not an Error instance
    expect(appLogError).not.toHaveBeenCalled()
    expect(closeDb).toHaveBeenCalled()
    expect(appLogInfo).toHaveBeenCalled()
    expect(appClose).toHaveBeenCalled()
  })

  it('should handle uncaughtException events', async () => {
    // Reset process.on mock
    processOn.mockReset()

    // Call handleExit to register the event handlers
    handleExit()

    // Find the handler for uncaughtException
    const calls = processOn.mock.calls
    const uncaughtExceptionCall = calls.find(call => call[0] === 'uncaughtException')
    expect(uncaughtExceptionCall).toBeDefined()

    if (uncaughtExceptionCall) {
      const [_, handler] = uncaughtExceptionCall

      // Reset mocks
      appLogError.mockReset()
      closeDb.mockReset()
      appLogInfo.mockReset()
      appClose.mockReset()

      // Call the handler with an error
      const error = new Error('Uncaught exception')
      handler(error)

      // Wait for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify it called exitGracefully correctly
      expect(appLogError).toHaveBeenCalledWith(error)
      expect(closeDb).toHaveBeenCalled()
      expect(appLogInfo).toHaveBeenCalledWith('Exiting...')
      expect(appClose).toHaveBeenCalled()
    }
  })

  it.skip('should set up signal handlers', () => {
    // Call handleExit to register the handlers
    handleExit()

    // Verify all the expected process.on calls
    const expectedEvents = ['uncaughtException', 'unhandledRejection', 'SIGTERM', 'SIGINT']
    const calls = processOn.mock.calls

    // Ensure each expected event has a handler registered
    for (const event of expectedEvents) {
      const hasHandler = calls.some(call => call[0] === event)
      expect(hasHandler).toBeTruthy()
    }

    // Test signal handlers (SIGTERM, SIGINT)
    const sigtermCall = calls.find(call => call[0] === 'SIGTERM')
    const sigintCall = calls.find(call => call[0] === 'SIGINT')

    if (sigtermCall) {
      // Reset mocks
      appLogInfo.mockReset()
      closeDb.mockReset()
      appClose.mockReset()

      // Call the SIGTERM handler
      const [_, handler] = sigtermCall
      handler()

      // Verify it called the correct functions
      expect(appLogInfo).toHaveBeenCalledWith('Received SIGTERM signal')
      expect(closeDb).toHaveBeenCalled()
      expect(appClose).toHaveBeenCalled()
    }

    if (sigintCall) {
      // Reset mocks
      appLogInfo.mockReset()
      closeDb.mockReset()
      appClose.mockReset()

      // Call the SIGINT handler
      const [_, handler] = sigintCall
      handler()

      // Verify it called the correct functions
      expect(appLogInfo).toHaveBeenCalledWith('Received SIGINT signal')
      expect(closeDb).toHaveBeenCalled()
      expect(appClose).toHaveBeenCalled()
    }
  })

  it.skip('should test the main IIFE execution', async () => {
    // Use Vitest's isolateModules equivalent
    vi.resetModules()

    // Reset the process.on mock before importing
    processOn.mockReset()

    // Import the module which will execute the IIFE
    await import('./server')

    // Verify that the process.on was called for all expected events
    const expectedEvents = ['uncaughtException', 'unhandledRejection', 'SIGTERM', 'SIGINT']
    const calls = processOn.mock.calls

    for (const event of expectedEvents) {
      const hasHandler = calls.some(call => call[0] === event)
      expect(hasHandler).toBeTruthy()
    }
  })
})
