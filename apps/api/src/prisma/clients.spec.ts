import type { PrismaClient } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'

describe('clients.js', () => {
  it('should use the mocked db prisma client', async () => {
    const { db } = await import('./clients.js')

    expect(db).toMatchObject(mockDeep<PrismaClient>())
  })

  it('should create a real db prisma client', async () => {
    vi.doUnmock('@prisma/client')
    vi.doUnmock('./clients.js')

    const { db } = await import('./clients.js')

    expect(db).toHaveProperty('$connect')
    expect(db).toHaveProperty('$disconnect')
  })
})
