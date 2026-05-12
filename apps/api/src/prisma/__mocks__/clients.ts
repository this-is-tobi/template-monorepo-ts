import type { PrismaClient } from '~/generated/prisma/client.js'
import { mockDeep, mockReset } from 'vitest-mock-extended'

export const db = mockDeep<PrismaClient>()
export const dbRo = mockDeep<PrismaClient>()

beforeEach(() => {
  mockReset(db)
  mockReset(dbRo)
})
