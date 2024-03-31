import { vi, describe, expect, it, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { MigrateDeploy } from '@prisma/migrate'

describe('Prisma clients', () => {
  beforeEach(() => {
    vi.doUnmock('./clients.js')
  })

  it('Should create a db prisma client', async () => {
    const { db } = await import('./clients.js')

    expect(db).toBeInstanceOf(PrismaClient)
  })

  it('Should create a migrate prisma client', async () => {
    const { migrate } = await import('./clients.js')

    expect(migrate).toBeInstanceOf(MigrateDeploy)
  })
})
