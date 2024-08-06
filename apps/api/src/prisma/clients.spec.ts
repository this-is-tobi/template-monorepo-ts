import { PrismaClient } from '@prisma/client'
import { MigrateDeploy } from '@prisma/migrate'

describe('prisma clients', () => {
  beforeEach(() => {
    vi.doUnmock('./clients.js')
  })

  it('should create a db prisma client', async () => {
    const { db } = await import('./clients.js')

    expect(db).toBeInstanceOf(PrismaClient)
  })

  it('should create a migrate prisma client', async () => {
    const { migrate } = await import('./clients.js')

    expect(migrate).toBeInstanceOf(MigrateDeploy)
  })
})
