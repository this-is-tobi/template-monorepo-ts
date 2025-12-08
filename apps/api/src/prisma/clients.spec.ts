import type { PrismaClient } from '~/generated/prisma/client.js'
import { mockDeep } from 'vitest-mock-extended'

describe('clients.js', () => {
  it('should use the mocked db prisma client', async () => {
    const { db } = await import('./clients.js')

    expect(db).toMatchObject(mockDeep<PrismaClient>())
  })

  it('should create a real db prisma client', async () => {
    // Mock the config to provide a valid database URL for testing
    vi.doMock('~/utils/config.js', () => ({
      config: {
        api: {
          dbUrl: 'postgresql://user:password@localhost:5432/testdb',
        },
      },
    }))

    vi.doUnmock('~/generated/prisma/client.js')
    vi.doUnmock('@prisma/adapter-pg')
    vi.doUnmock('./clients.js')

    const { db } = await import('./clients.js')

    expect(db).toHaveProperty('$connect')
    expect(db).toHaveProperty('$disconnect')
  })
})
