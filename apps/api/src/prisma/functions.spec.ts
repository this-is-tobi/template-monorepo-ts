import { execSync } from 'node:child_process'
import { db } from './clients.js'
import { closeConnection, migrateDb, openConnection } from './functions.js'

// Mock the dependencies
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

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

  describe('migrateDb', () => {
    it('should execute prisma migrate deploy from local node_modules', async () => {
      await migrateDb()

      expect(execSync).toHaveBeenCalledTimes(1)
      expect(execSync).toHaveBeenCalledWith(
        'bun run ./node_modules/prisma/build/index.js migrate deploy',
        expect.objectContaining({ stdio: 'inherit' }),
      )
    })

    it('should handle execSync errors properly', async () => {
      const execError = new Error('Prisma migration failed')
      vi.mocked(execSync).mockImplementationOnce(() => {
        throw execError
      })

      await expect(migrateDb()).rejects.toThrow('Prisma migration failed')

      expect(execSync).toHaveBeenCalledWith(
        'bun run ./node_modules/prisma/build/index.js migrate deploy',
        expect.objectContaining({ stdio: 'inherit' }),
      )
    })
  })
})
