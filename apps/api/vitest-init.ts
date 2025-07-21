import { beforeEach, vi } from 'vitest'

// Mock modules needed for all tests
vi.mock('~/prisma/clients.js')
vi.mock('~/prisma/functions.js')

// Force process.env.NODE_ENV to 'test' for all tests
process.env.NODE_ENV = 'test'

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
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
}

// Apply the process mock
vi.stubGlobal('process', mockProcess)

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
