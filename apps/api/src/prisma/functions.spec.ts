import { db } from './clients.js'
import { closeConnection, openConnection } from './functions.js'

// Mock the dependencies
vi.mock('./clients.js', () => ({
  db: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

describe('prisma functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('openConnection', () => {
    it('should call db.$connect', async () => {
      await openConnection()

      expect(db.$connect).toHaveBeenCalledTimes(1)
    })
  })

  describe('closeConnection', () => {
    it('should call db.$disconnect', async () => {
      await closeConnection()

      expect(db.$disconnect).toHaveBeenCalledTimes(1)
    })
  })
})
