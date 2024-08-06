import type { PrismaClient } from '@prisma/client'
// @ts-expect-error no types available
import type { MigrateDeploy } from '@prisma/migrate'
import { mockDeep, mockReset } from 'vitest-mock-extended'

export const db = mockDeep<PrismaClient>()

export const migrate = mockDeep<MigrateDeploy>()

beforeEach(() => {
  mockReset(db)
  mockReset(migrate)
})
