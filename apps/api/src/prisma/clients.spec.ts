import type { PrismaClient } from '~/generated/prisma/client.js'
import { mockDeep } from 'vitest-mock-extended'

describe('clients.js', () => {
  it('should use the mocked db prisma client', async () => {
    const { db } = await import('./clients.js')

    expect(db).toMatchObject(mockDeep<PrismaClient>())
  })

  it('should use the mocked dbRo prisma client', async () => {
    const { dbRo } = await import('./clients.js')

    expect(dbRo).toMatchObject(mockDeep<PrismaClient>())
  })

  it('should create a real db prisma client', async () => {
    // Mock the config to provide a valid database URL for testing
    vi.doMock('~/utils/config.js', () => ({
      config: {
        db: {
          url: 'postgresql://user:password@localhost:5432/testdb',
          readUrl: '',
          pool: { max: 5, roMax: 5 },
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

  it('should create a real dbRo client pointing to readUrl when set', async () => {
    vi.doMock('~/utils/config.js', () => ({
      config: {
        db: {
          url: 'postgresql://user:password@host-rw:5432/testdb',
          readUrl: 'postgresql://user:password@host-ro:5432/testdb',
          pool: { max: 5, roMax: 5 },
        },
      },
    }))

    vi.doUnmock('~/generated/prisma/client.js')
    vi.doUnmock('@prisma/adapter-pg')
    vi.doUnmock('./clients.js')

    const { dbRo } = await import('./clients.js')

    expect(dbRo).toHaveProperty('$connect')
    expect(dbRo).toHaveProperty('$disconnect')
  })
})
