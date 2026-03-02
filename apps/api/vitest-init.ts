import { beforeEach, vi } from 'vitest'

// Mock modules needed for all tests
vi.mock('~/prisma/clients.js')
vi.mock('~/prisma/functions.js')
vi.mock('~/modules/auth/auth.js')
vi.mock('~/modules/auth/middleware.js')

// Force process.env.NODE_ENV to 'test' for all tests
process.env.NODE_ENV = 'test'

// Suppress known Fastify bug: the fallback error handler's catch block tries
// writeHead() again after headers are already sent (ERR_HTTP_HEADERS_SENT).
// Harmless in tests — the response was already correctly committed.
// @see https://github.com/fastify/fastify/issues/6286
process.on('unhandledRejection', (error: unknown) => {
  if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ERR_HTTP_HEADERS_SENT') {
    return
  }
  // Re-throw genuine unhandled rejections so Vitest still catches them
  throw error
})

// Capture real process event methods before mocking, so event handlers
// (e.g. Fastify's unhandledRejection listener) still work while remaining spy-able
const realProcessOn = process.on.bind(process)
const realProcessOnce = process.once.bind(process)
const realProcessRemoveListener = process.removeListener.bind(process)

// Create a more robust process mock that prevents process.exit from terminating tests
const mockProcess = {
  ...process,
  exit: vi.fn((code) => {
    // This will make the tests fail if process.exit is called with any value
    // but only if we're not already in a test environment
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(`process.exit called with code ${code}`)
    }
    return undefined as never
  }),
  on: vi.fn((...args: Parameters<typeof process.on>) => realProcessOn(...args)),
  once: vi.fn((...args: Parameters<typeof process.once>) => realProcessOnce(...args)),
  removeListener: vi.fn((...args: Parameters<typeof process.removeListener>) => realProcessRemoveListener(...args)),
}

// Apply the process mock
vi.stubGlobal('process', mockProcess)

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
