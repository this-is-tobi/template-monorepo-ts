import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset } from 'vitest-mock-extended'

export const db = mockDeep<PrismaClient>()

beforeEach(() => {
  mockReset(db)
})
