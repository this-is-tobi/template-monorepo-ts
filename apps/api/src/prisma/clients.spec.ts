import { PrismaClient } from '@prisma/client'

describe('prisma clients', () => {
  beforeEach(() => {
    vi.doUnmock('./clients.js')
  })

  it('should create a db prisma client', async () => {
    const { db } = await import('./clients.js')

    expect(db).toBeInstanceOf(PrismaClient)
  })
})
