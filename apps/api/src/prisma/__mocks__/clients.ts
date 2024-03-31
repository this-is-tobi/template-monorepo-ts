import { beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { MigrateDeploy } from '@prisma/migrate'
import { mockReset, mockDeep } from 'vitest-mock-extended'

beforeEach(() => {
  mockReset(db)
  mockReset(migrate)
})

export const db = mockDeep<PrismaClient>()

export const migrate = mockDeep<MigrateDeploy>()
