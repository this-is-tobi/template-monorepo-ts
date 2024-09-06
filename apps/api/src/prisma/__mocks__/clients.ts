import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

export const db = mockDeep<PrismaClient>()

beforeEach(() => {
  mockReset(db)
})
